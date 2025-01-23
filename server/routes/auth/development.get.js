export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'development') {
    await setUserSession(event, {
      user: {
        login: 'Developer',
      },
      loggedInAt: Date.now(),
    });
    return sendRedirect(event, '/');
  } else {
    throw createError({ status: 404, statusMessage: 'Page not found: ' + event.path });
  }
});
