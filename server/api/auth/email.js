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
        email: data.email,
        emailVerified: false,
        loginProvider: 'OTP',
        otp: code,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: data.email,
          otp: code,
        },
      });

    return sendMail({
      subject: code + ' - Einmalcode EUDR Entwaldungsverordnung Tool',
      text:
        'Um Ihr Login beim EUDR Entwaldungsverordnung Tool abzuschließen, geben Sie bitte diesen Einmalcode ein: ' +
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
      emailVerified: true,
      otp: null, // Clear the OTP after successful login
      statementToken: user.statementToken || generate(20, { specialChars: false }), // and make sure the user has a statement token
    })
    .where(eq(users.id, user.id));

  await setUserSession(event, {
    user: {
      login: user.id,
    },
    loggedInAt: Date.now(),
  });

  return sendRedirect(event, '/account');
});
