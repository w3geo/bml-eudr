import { and, eq, gt, isNotNull, lt, sql } from 'drizzle-orm';
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

/**
 * @param {import('h3').H3Event} event
 * @param {string} [message] shown instead of the generic retry message
 */
function failLogin(event, message) {
  const cookieOptions = { expires: new Date(Date.now() + 10000), secure: true };
  setCookie(event, 'login-retry', 'true', cookieOptions);
  if (message) {
    setCookie(event, 'login-error', message, cookieOptions);
  }
  return sendRedirect(event, '/account');
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
  /** @type {UserPayload} */
  const data = event.method === 'POST' ? await readBody(event) : await getQuery(event);
  if (event.method === 'GET' && !data.code) {
    throw createError({ status: 400, statusMessage: 'Bad Request' });
  }
  const phone = data?.phone && isPhoneNumber(data.phone) ? data.phone : undefined;
  const id = data?.email || phone;
  if (!id) {
    throw createError({
      status: 400,
      statusMessage: 'Bad Request',
    });
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

    // A new code replaces an unused one, along with its expiry and attempts
    const otpExpiresAt = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000);
    await useDb()
      .insert(users)
      .values({
        id,
        loginProvider,
        otp: code,
        otpExpiresAt,
        otpAttempts: 0,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          otp: code,
          otpExpiresAt,
          otpAttempts: 0,
        },
      });

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

  if (!/^\d{6}$/.test(String(data.code))) {
    return failLogin(event);
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
    return failLogin(
      event,
      'Der Code ist nicht mehr gültig. Bitte fordern Sie einen neuen Code an.',
    );
  }

  if (user.otp !== String(data.code)) {
    return failLogin(
      event,
      user.otpAttempts >= OTP_MAX_ATTEMPTS
        ? 'Der Code wurde zu oft falsch eingegeben. Bitte fordern Sie einen neuen Code an.'
        : undefined,
    );
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

  return sendRedirect(event, '/account');
});
