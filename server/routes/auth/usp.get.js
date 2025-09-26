import users from '~~/server/db/schema/users';

export default defineOAuthUSPEventHandler({
  async onSuccess(event, { user }) {
    // {
    //   login: 'XFN+558990w:1Q+hUTUFXbLSxLJimdn+GVVgVBg=',
    //   firstName: 'XXXDagmar',
    //   lastName: 'XXXKörner',
    //   Gemeindekennziffer: '30740',
    //   Gemeindebezeichnung: 'Schwechat',
    //   Postleitzahl: '2320',
    //   Ortschaft: 'Schwechat',
    //   Strasse: 'Alfred Horn-Straße',
    //   Hausnummer: '3',
    //   Stiege: '',
    //   Tuer: '1-3',
    // };
    const name = `${user.firstName} ${user.lastName}`;
    const address = `${user.Strasse} ${user.Hausnummer}${user.Stiege ? `/${user.Stiege}` : ''}${user.Tuer ? `/${user.Tuer}` : ''}, ${user.Postleitzahl} ${user.Ortschaft}`;
    await useDb()
      .insert(users)
      .values({
        id: user.login,
        loginProvider: 'USP',
      })
      .onConflictDoNothing();

    await setUserSession(event, {
      user: {
        login: user.login,
      },
      loginProvider: 'USP',
      secure: { name, address, identifierType: 'GLN', identifierValue: user.identifierValue },
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
