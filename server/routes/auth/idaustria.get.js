export default defineOAuthIdAustriaEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        login: user.login,
      },
      loggedInAt: Date.now(),
    });

    return sendRedirect(event, '/');
  },
});
