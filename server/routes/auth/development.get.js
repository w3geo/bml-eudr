import users from '~/server/db/schema/users';

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'development') {
    await useDb()
      .insert(users)
      .values({
        id: 'Developer',
        name: 'Dave Eloper',
        address: 'Zankwarn 2, 5571 Mariapfarr',
        email: null,
        emailVerified: false,
        identifierType: null,
        identifierValue: null,
        loginProvider: 'IDA',
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: 'Dave Eloper',
          address: 'Zankwarn 2, 5571 Mariapfarr',
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
