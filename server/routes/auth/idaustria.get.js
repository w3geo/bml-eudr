import { getUser, putUser } from '~/server/db/users';

export default defineOAuthIdAustriaEventHandler({
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
    if (!(await getUser(user.login))) {
      await putUser({
        id: user.login,
        name: `${user.firstName} ${user.lastName}`,
        address: `${user.Strasse} ${user.Hausnummer}${user.Stiege ? `/${user.Stiege}` : ''}${user.Tuer ? `/${user.Tuer}` : ''}, ${user.Postleitzahl} ${user.Ortschaft}`,
        email: null,
        emailverified: 0,
        identifiertype: null,
        identifiervalue: null,
        loginprovider: 'IDAustria',
      });
    }
    await setUserSession(event, {
      user: {
        login: user.login,
      },
      loggedInAt: Date.now(),
    });

    return sendRedirect(event, '/');
  },
});
