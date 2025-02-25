export default defineNitroPlugin(() => {
  // Called when the session is fetched during SSR for the Vue composable (/api/_auth/session)
  // Or when we call useUserSession().fetch()
  //eslint-disable-next-line no-unused-vars
  sessionHooks.hook('fetch', async (session, event) => {
    // extend User Session by calling your database
    // or
    // throw createError({ ... }) if session is invalid for example
  });

  // Called when we call useUserSession().clear() or clearUserSession(event)
  //eslint-disable-next-line no-unused-vars
  sessionHooks.hook('clear', async (session, event) => {
    // Log that user logged out
  });
});
