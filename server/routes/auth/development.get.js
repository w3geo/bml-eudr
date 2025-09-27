import { eq } from 'drizzle-orm';
import users from '~~/server/db/schema/users';

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'development') {
    const id = 'Developer';
    const name = 'Dave Eloper';
    const address = 'Rosengasse 7, 3424 Zeiselmauer-Wolfpassing';
    await useDb()
      .insert(users)
      .values({
        id,
        loginProvider: 'IDA',
      })
      .onConflictDoNothing();
    const [user] = await useDb().select().from(users).where(eq(users.id, id));
    await setUserSession(event, {
      user: {
        login: id,
      },
      loginProvider: 'IDA',
      secure: {
        name,
        address,
        identifierType: user?.identifierType,
        identifierValue: user?.identifierValue,
      },
      loggedInAt: Date.now(),
    });
    return sendRedirect(event, '/account');
  } else {
    throw createError({ status: 404, statusMessage: 'Page not found: ' + event.path });
  }
});
