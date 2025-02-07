import users from '~/server/db/schema/users';

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
    const name = `${user.firstName} ${user.lastName}`;
    const address = `${user.Strasse} ${user.Hausnummer}${user.Stiege ? `/${user.Stiege}` : ''}${user.Tuer ? `/${user.Tuer}` : ''}, ${user.Postleitzahl} ${user.Ortschaft}`;
    await useDb()
      .insert(users)
      .values({
        id: user.login,
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
        login: user.login,
      },
      loggedInAt: Date.now(),
    });

    return sendRedirect(event, '/profile');
  },
});
