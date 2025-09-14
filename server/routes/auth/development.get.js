import users from '~~/server/db/schema/users';

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'development') {
    const name = 'Dave Eloper';
    const address = 'Rosengasse 7, 3424 Zeiselmauer-Wolfpassing';
    await useDb()
      .insert(users)
      .values({
        id: 'Developer',
        emailVerified: false,
        loginProvider: 'IDA',
      })
      //TODO remove - this only deletes legacy data
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: null,
          address: null,
        },
      });
    await setUserSession(event, {
      user: {
        login: 'Developer',
      },
      secure: { name, address },
      loggedInAt: Date.now(),
    });
    return sendRedirect(event, '/account');
  } else {
    throw createError({ status: 404, statusMessage: 'Page not found: ' + event.path });
  }
});
