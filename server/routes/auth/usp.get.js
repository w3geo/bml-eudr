export default defineOAuthUSPEventHandler({
  async onSuccess(event, { user }) {
    const name = `${user.name}`;
    const address = `${user.streetAddress} ${user.houseNumber}, ${user.postalCode} ${user.locality}`;
    const identifierValue = user.enterpriseKeys
      ?.split(';')
      .find(/** @param {string} k */ (k) => k.startsWith('SE#'))
      ?.substring(3);

    await setUserSession(event, {
      user: {
        login: user.login,
      },
      loginProvider: 'USP',
      secure: { name, address, identifierType: 'GLN', identifierValue },
      loggedInAt: Date.now(),
    });

    return sendRedirect(event, '/account');
  },
  async onError(event, error) {
    setCookie(event, 'login-error', error.message, {
      expires: new Date(Date.now() + 10000),
      secure: true,
    });
    return sendRedirect(event, '/account');
  },
});
