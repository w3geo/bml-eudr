import { request } from 'https';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const forwardOrigin = getAmaForwardOrigin(body.cid);
    if (forwardOrigin && forwardOrigin !== getPublicOrigin(event)) {
      // Login started on another instance (e.g. staging or local dev). Forward the callback
      // with its body (307 keeps the POST), but only to an allowed origin.
      return sendRedirect(event, `${forwardOrigin}/api/ama/login`, 307);
    }
    const base64 = btoa(`${process.env.AMA_CLIENT_ID}:${process.env.AMA_CLIENT_SECRET}`);
    const options = {
      hostname: 'restds.services.ama.at',
      port: 443,
      path: '/webservice-zlb-partnerseitenlogin/PartnerseitenLoginService/metadatenHolen',
      method: 'POST',
      cert: process.env.AMA_CERT,
      key: process.env.AMA_KEY,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${base64}`,
      },
    };
    /** @type {string} */
    const responseBody = await new Promise((resolve, reject) => {
      const req = request(options, (res) => {
        /** @type {Array<Buffer>} */
        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString();
          if (res.statusCode !== 200) {
            const error = new Error(
              `metadatenHolen returned ${res.statusCode}: ${text.slice(0, 500) || '(empty body)'}`,
            );
            error.name = 'AmaResponseError';
            return reject(error);
          }
          resolve(text);
          // {
          //   partnerseitenDaten: {
          //     betriebsnummern: 1234567,
          //     bewname: 'MAX MUSTERMANN',
          //     bewadr: 'HINTERHOLZ 8, 1234 HINTERTUPFING IM NIRGENDWO',
          //     GLN: '9111234567890',
          //   },
          // };
        });
        res.on('error', reject);
      });
      req.on('error', reject);
      req.write(
        JSON.stringify({
          tokenKey: body.token,
          partnerseite: 'ps_eudr_bml',
        }),
      );
      req.end();
    });
    const { partnerseitenDaten: user } = JSON.parse(responseBody);
    // Some eAMA accounts have no GLN. Use the LFBIS number as identifier instead, like for SMS login
    const gln = user.GLN ? String(user.GLN).trim() : '';
    if (!gln) {
      console.warn('No GLN from eAMA, using LFBIS number as ONI', {
        responseBody,
        decoded: user,
      });
    }

    // eAMA only provides the address as a single string
    const address = toPostalAddress(user.bewadr);
    if (!isValidAddress(address, false)) {
      console.warn(
        'Incomplete address from eAMA',
        address ? getAddressShape(address) : '(no address)',
      );
    }

    await setUserSession(event, {
      user: {
        login: user.betriebsnummern,
      },
      loggedInAt: Date.now(),
      loginProvider: 'AMA',
      secure: {
        name: user.bewname,
        address,
        identifierType: gln ? 'GLN' : 'ONI',
        identifierValue: gln || String(user.betriebsnummern),
        lfbis: user.betriebsnummern,
      },
    });

    deleteCookie(event, 'login-retry');
    return sendRedirect(event, '/account');
  } catch (error) {
    const err = /** @type {Error} */ (error);
    if (err.name === 'AmaResponseError') {
      console.error('AMA login failed:', err.message);
    } else {
      console.error('AMA login error:', err);
    }
    setCookie(event, 'login-retry', 'true', {
      maxAge: 10,
      secure: true,
    });
    setCookie(
      event,
      'login-error',
      'Die Anmeldung über eAMA ist fehlgeschlagen. Bitte versuchen Sie es noch einmal.',
      {
        maxAge: 10,
        secure: true,
      },
    );
    return sendRedirect(event, '/account');
  }
});
