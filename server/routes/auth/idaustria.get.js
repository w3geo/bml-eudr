export default defineOAuthIdAustriaEventHandler({
  async onSuccess(event, { user, tokens }) {
    console.log(user, tokens);
    await setUserSession(event, {
      user: {
        login: user.login,
      },
      loggedInAt: Date.now(),
    });

    return sendRedirect(event, '/');
  },
});
