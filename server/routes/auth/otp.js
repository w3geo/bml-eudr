import { and, eq, gt, isNotNull, lt, or, sql } from 'drizzle-orm';
import { generate } from 'otp-generator';
import lfbisFarm from '~~/server/db/schema/lfbis_farm';
import lfbisField from '~~/server/db/schema/lfbis_field';
import users from '~~/server/db/schema/users';

/**
 * Either `email` or `phone` identifies the user. With `phone`, both requesting and verifying a
 * code additionally require a known `lfbis`, which becomes the user's identifier.
 * @typedef {Object} UserPayload
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [lfbis]
 * @property {string} [code]
 */

/** How long a code can be used after it was requested */
const OTP_VALIDITY_MINUTES = 15;

/** Verification attempts per code, so the code cannot be found by trying */
const OTP_MAX_ATTEMPTS = 5;

/** Minimum time between two codes for the same account, while the previous one is unused */
const OTP_REQUEST_COOLDOWN_SECONDS = 60;

/** Codes per account and window, so new codes cannot be used to get more verification attempts */
const OTP_REQUESTS_PER_WINDOW = 5;
const OTP_REQUEST_WINDOW_MINUTES = 60;

/** Codes per IP address and hour */
const OTP_REQUESTS_PER_IP_AND_HOUR = 30;
const ipRateLimit = createRateLimiter(OTP_REQUESTS_PER_IP_AND_HOUR, 60 * 60 * 1000);

/**
 * The same message for all request limits, because users can only wait either way.
 * @param {number} waitMs time until a new code can be requested
 * @param {{ codePending?: boolean }} [data] `codePending` lets the client ask for the code that
 * was already sent
 */
function tooManyRequests(waitMs, data) {
  const minutes = Math.max(1, Math.ceil(waitMs / 60000));
  const when = minutes === 1 ? 'in einer Minute' : `in ${minutes} Minuten`;
  return createError({
    status: 429,
    statusMessage: 'Too Many Requests',
    message: `Zu viele Anfragen, bitte ${when} erneut versuchen.`,
    data,
  });
}

/**
 * @param {string} message
 * @param {boolean} [codeInvalid] the code cannot be used any more, so a new one is needed
 */
function failLogin(message, codeInvalid) {
  return createError({
    status: 400,
    statusMessage: 'Bad Request',
    message,
    data: codeInvalid ? { codeInvalid } : undefined,
  });
}

/**
 * @param {string} lfbis
 * @returns {Promise<boolean>}
 */
async function lfbisExists(lfbis) {
  const db = useDb();
  for (const table of [lfbisFarm, lfbisField]) {
    const [row] = await db
      .select({ lfbis: table.lfbis })
      .from(table)
      .where(eq(table.lfbis, lfbis))
      .limit(1);
    if (row) {
      return true;
    }
  }
  return false;
}

export default defineEventHandler(async (event) => {
  // Verification is a POST as well, so a wrong code can be corrected without leaving the page
  assertMethod(event, 'POST');
  /** @type {UserPayload} */
  const data = await readBody(event);
  const phone = data?.phone && isPhoneNumber(data.phone) ? data.phone : undefined;
  const id = data?.email || phone;
  if (!id) {
    throw createError({
      status: 400,
      statusMessage: 'Bad Request',
    });
  }

  // Before the LFBIS check, so LFBIS numbers cannot be probed without limit either
  const ip = getClientIp(event);
  const ipWaitMs = !data.code && ip ? ipRateLimit(ip) : 0;
  if (ipWaitMs) {
    throw tooManyRequests(ipWaitMs);
  }

  const lfbis = phone ? data.lfbis?.trim() : undefined;
  if (phone && (!lfbis || !(await lfbisExists(lfbis)))) {
    throw createError({
      status: 400,
      statusMessage: 'Bad Request',
      message: 'Betriebsnummer nicht gefunden',
    });
  }
  /** @type {import('~~/shared/utils/constants').LoginProvider} */
  const loginProvider = phone ? 'SMS' : 'OTP';

  if (!data?.code) {
    const code = generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
      digits: true,
    });

    // A new code replaces an unused one, along with its expiry and attempts. The limits are
    // checked in the same statement, so parallel requests cannot get more codes than allowed.
    const otpExpiresAt = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000);
    const windowExpired = sql`(${users.otpRequestWindowStart} IS NULL OR ${users.otpRequestWindowStart} <= now() - make_interval(mins => ${OTP_REQUEST_WINDOW_MINUTES}))`;
    const [requested] = await useDb()
      .insert(users)
      .values({
        id,
        loginProvider,
        otp: code,
        otpExpiresAt,
        otpAttempts: 0,
        otpRequestedAt: sql`now()`,
        otpRequestWindowStart: sql`now()`,
        otpRequestCount: 1,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          otp: code,
          otpExpiresAt,
          otpAttempts: 0,
          otpRequestedAt: sql`now()`,
          otpRequestWindowStart: sql`CASE WHEN ${windowExpired} THEN now() ELSE ${users.otpRequestWindowStart} END`,
          otpRequestCount: sql`CASE WHEN ${windowExpired} THEN 1 ELSE ${users.otpRequestCount} + 1 END`,
        },
        setWhere: and(
          // No cooldown after a successful login, which clears the code, e.g. to log in again
          sql`(${users.otp} IS NULL OR ${users.otpRequestedAt} IS NULL OR ${users.otpRequestedAt} <= now() - make_interval(secs => ${OTP_REQUEST_COOLDOWN_SECONDS}))`,
          or(windowExpired, lt(users.otpRequestCount, OTP_REQUESTS_PER_WINDOW)),
        ),
      })
      .returning();

    if (!requested) {
      // E.g. after going back from the code entry, the code that was just sent can still be used
      const [user] = await useDb().select().from(users).where(eq(users.id, id));
      const now = Date.now();
      const cooldownEnd =
        user?.otp && user.otpRequestedAt
          ? user.otpRequestedAt.getTime() + OTP_REQUEST_COOLDOWN_SECONDS * 1000
          : 0;
      const windowEnd =
        user && user.otpRequestCount >= OTP_REQUESTS_PER_WINDOW && user.otpRequestWindowStart
          ? user.otpRequestWindowStart.getTime() + OTP_REQUEST_WINDOW_MINUTES * 60 * 1000
          : 0;
      const codePending = Boolean(
        user?.otp &&
        user.otpExpiresAt &&
        user.otpExpiresAt.getTime() > now &&
        user.otpAttempts < OTP_MAX_ATTEMPTS,
      );
      throw tooManyRequests(Math.max(cooldownEnd, windowEnd) - now, { codePending });
    }

    if (phone) {
      // "Code" as a separate word helps Safari (iOS/macOS) offer the code for AutoFill. The
      // optional last line binds the code to this site and lets Chrome (Android) read it with the
      // WebOTP API. Bound codes are not offered on a mismatching host, and localhost or IP
      // addresses are not accepted as domains, so plain codes are used there.
      const host = getRequestHost(event, { xForwardedHost: true }).replace(/:\d+$/, '');
      const isDomain = host.includes('.') && !/^[\d.]+$/.test(host);
      let content = `Ihr Code für EUDR Meldung: ${code}`;
      if (isDomain) {
        content += `\n\n@${host} #${code}`;
      }
      await sendSms({ to: phone, content });
    } else {
      // "Code" as a separate word helps Safari (iOS/macOS) offer the code from Mail for AutoFill
      await sendMail({
        subject: `Ihr Code für EUDR Meldung: ${code}`,
        text:
          `Ihr Code für EUDR Meldung: ${code}\n\n` +
          'Geben Sie diesen Code ein, um Ihr Login abzuschließen.',
        to: id,
      });
    }
    return sendNoContent(event, 201);
  }

  const wrongCode = 'Falscher Code, bitte erneut versuchen.';
  if (!/^\d{6}$/.test(String(data.code))) {
    throw failLogin(wrongCode);
  }

  // Count the attempt in the same statement that checks expiry and attempts, so parallel requests
  // cannot get more attempts than allowed
  const [user] = await useDb()
    .update(users)
    .set({ otpAttempts: sql`${users.otpAttempts} + 1` })
    .where(
      and(
        eq(users.id, id),
        isNotNull(users.otp),
        gt(users.otpExpiresAt, new Date()),
        lt(users.otpAttempts, OTP_MAX_ATTEMPTS),
      ),
    )
    .returning();

  if (!user) {
    // Also for unknown users, so the message does not reveal whether an account exists
    throw failLogin('Code ungültig, bitte neu anfordern.', true);
  }

  if (user.otp !== String(data.code)) {
    if (user.otpAttempts < OTP_MAX_ATTEMPTS) {
      throw failLogin(wrongCode);
    }
    // Without a pending code, a new one can be requested without the cooldown
    await useDb().update(users).set({ otp: null, otpExpiresAt: null }).where(eq(users.id, user.id));
    throw failLogin('Zu viele Fehlversuche, bitte neuen Code anfordern.', true);
  }

  // The LFBIS number is only stored after the code was verified, so requesting a code for a
  // phone number cannot change that user's identifier
  if (lfbis) {
    user.identifierType = 'ONI';
    user.identifierValue = lfbis;
  }

  await useDb()
    .update(users)
    .set({
      // Clear the OTP after successful login
      otp: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      lastLoginAt: new Date(),
      loginProvider,
      identifierType: user.identifierType,
      identifierValue: user.identifierValue,
    })
    .where(eq(users.id, user.id));

  await setUserSession(event, {
    user: {
      login: user.id,
    },
    loggedInAt: Date.now(),
    loginProvider,
    secure: {
      name: user.name ?? undefined,
      // Stored as a single string; one that cannot be parsed can be corrected under "Mein Konto"
      address: toPostalAddress(user.address),
      identifierType: user.identifierType ?? undefined,
      identifierValue: user.identifierValue ?? undefined,
      lfbis,
    },
  });

  return sendNoContent(event);
});
