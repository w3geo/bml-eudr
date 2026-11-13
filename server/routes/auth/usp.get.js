import { decodeJwt } from 'jose';

export default defineOAuthUSPEventHandler({
  async onSuccess(event, { user, tokens }) {
    const name = `${user.name}`;
    const address = {
      street: [user.streetAddress, user.houseNumber]
        .filter((part) => part?.trim())
        .join(' ')
        .trim(),
      postalCode: user.postalCode?.trim() ?? '',
      city: user.locality?.trim() ?? '',
    };
    if (!isValidAddress(address, false)) {
      console.warn('Incomplete address from USP', getAddressShape(address));
    }
    const identifierValue = user.enterpriseKeys
      ?.split(';')
      .find(/** @param {string} k */ (k) => k.startsWith('SE#'))
      ?.substring(3);

    await setUserSession(event, {
      user: {
        login: user.login,
      },
      loginProvider: 'USP',
      secure: {
        name,
        address,
        identifierType: 'GLN',
        identifierValue,
        lfbis: user.lfbis,
        sid: /** @type {string|undefined} */ (decodeJwt(tokens.access_token).sid),
      },
      loggedInAt: Date.now(),
    });

    return sendRedirect(event, '/account');
  },
  async onError(event, error) {
    console.error('LOGIN ERROR USP', error);
    setCookie(event, 'login-error', error.message, {
      maxAge: 10,
      secure: true,
    });
    return sendRedirect(event, '/account');
  },
});
