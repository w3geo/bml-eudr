import users from '~~/server/db/schema/users';

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'development') {
    const name = 'Dave Eloper';
    const address = 'Rosengasse 7, 3424 Zeiselmauer-Wolfpassing';
    await useDb()
      .insert(users)
      .values({
        id: 'Developer',
        name,
        address,
        email: null,
        emailVerified: false,
        identifierType: null,
        identifierValue: null,
        loginProvider: 'IDA',
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name,
          address,
        },
      });
    await setUserSession(event, {
      user: {
        login: 'Developer',
      },
      loggedInAt: Date.now(),
    });
    return sendRedirect(event, '/account');
  } else {
    throw createError({ status: 404, statusMessage: 'Page not found: ' + event.path });
  }
});
