import { eq } from 'drizzle-orm';
import users from '~~/server/db/schema/users';

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
    const address = {
      street: [
        user.Strasse,
        [user.Hausnummer, user.Stiege, user.Tuer].filter((part) => part?.trim()).join('/'),
      ]
        .filter((part) => part?.trim())
        .join(' ')
        .trim(),
      postalCode: user.Postleitzahl?.trim() ?? '',
      city: user.Ortschaft?.trim() ?? '',
    };
    if (!isValidAddress(address, false)) {
      console.warn('Incomplete address from ID Austria', getAddressShape(address));
    }
    await useDb()
      .insert(users)
      .values({
        id: user.login,
        loginProvider: 'IDA',
        lastLoginAt: new Date(),
      })
      .onConflictDoUpdate({ target: users.id, set: { lastLoginAt: new Date() } });

    const [userData] = await useDb().select().from(users).where(eq(users.id, user.login));
    await setUserSession(event, {
      user: {
        login: user.login,
      },
      loginProvider: 'IDA',
      secure: {
        name: name,
        address: address,
        identifierType: userData?.identifierType ?? undefined,
        identifierValue: userData?.identifierValue ?? undefined,
      },
      loggedInAt: Date.now(),
    });

    return sendRedirect(event, '/account');
  },
  async onError(event, error) {
    if (await handleInvalidGrant(event, 'ID Austria', error)) {
      return;
    }
    setCookie(event, 'login-error', error.message, {
      maxAge: 10,
      secure: true,
    });
    return sendRedirect(event, '/account');
  },
});
