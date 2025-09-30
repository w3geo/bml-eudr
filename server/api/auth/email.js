import { and, eq } from 'drizzle-orm';
import { generate } from 'otp-generator';
import users from '~~/server/db/schema/users';

/**
 * @typedef {Object} UserPayload
 * @property {string} email
 * @property {string} [code]
 */

export default defineEventHandler(async (event) => {
  /** @type {UserPayload} */
  const data = event.method === 'POST' ? await readBody(event) : await getQuery(event);
  if (!data?.email) {
    throw createError({
      status: 400,
      statusMessage: 'email is required',
    });
  }

  if (!data?.code) {
    const { sendMail } = useNodeMailer();
    const code = generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
      digits: true,
    });

    await useDb()
      .insert(users)
      .values({
        id: data.email,
        loginProvider: 'OTP',
        otp: code,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          otp: code,
        },
      });

    return sendMail({
      subject: code + ' - Einmalcode EUDR Meldung',
      text:
        'Um Ihr Login bei EUDR Meldung abzuschließen, geben Sie bitte diesen Einmalcode ein: ' +
        code,
      to: data.email,
    });
  }

  const [user] = await useDb()
    .select()
    .from(users)
    .where(and(eq(users.id, data.email), eq(users.otp, data.code)));

  if (!user) {
    setCookie(event, 'login-retry', 'true', {
      expires: new Date(Date.now() + 10000),
      secure: true,
    });
    return sendRedirect(event, '/account');
  }

  await useDb()
    .update(users)
    .set({
      otp: null, // Clear the OTP after successful login
      statementToken: user.statementToken || generate(20, { specialChars: false }), // and make sure the user has a statement token
    })
    .where(eq(users.id, user.id));

  await setUserSession(event, {
    user: {
      login: user.id,
    },
    loggedInAt: Date.now(),
    loginProvider: 'OTP',
    secure: {
      name: user.name,
      address: user.address,
      identifierType: user.identifierType,
      identifierValue: user.identifierValue,
    },
  });

  return sendRedirect(event, '/account');
});
