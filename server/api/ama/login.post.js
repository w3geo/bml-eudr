import { request } from 'https';
import users from '~~/server/db/schema/users';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    console.log('AMA login request body:', body);
    if (!body.cid || body.cid !== getCookie(event, 'eama-cid')) {
      setCookie(event, 'login-retry', 'true', {
        expires: new Date(Date.now() + 10000),
        secure: true,
      });
      return sendRedirect(event, '/account');
    }

    deleteCookie(event, 'eama-cid');
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
    const { partnerseitenDaten: user } = await new Promise((resolve, reject) => {
      const req = request(options, (res) => {
        if (res.statusCode !== 200) {
          console.error(`AMA login request failed: ${res}`);
          return reject(new Error(`Request failed with status code ${res.statusCode}`));
        }
        /** @type {Array<Buffer>} */
        const chunks = [];
        res.on('data', function (d) {
          chunks.push(d);
        });
        res.on('end', () => {
          const json = JSON.parse(Buffer.concat(chunks).toString());
          console.log('AMA login payload response:', json);
          resolve(json);
          // {
          //   partnerseitenDaten: {
          //     betriebsnummern: 1234567,
          //     bewname: 'MAX MUSTERMANN',
          //     bewadr: 'HINTERHOLZ 8, 1234 HINTERTUPFING IM NIRGENDWO',
          //     GLN: '9111234567890',
          //   },
          // };
        });
      });
      req.write(
        JSON.stringify({
          tokenKey: body.token,
          partnerseite: 'ps_eudr_bml',
        }),
      );
      req.end();
    });
    await useDb()
      .insert(users)
      .values({
        id: user.betriebsnummern,
        name: user.bewname,
        address: user.bewadr,
        email: null,
        emailVerified: false,
        identifierType: 'GLN',
        identifierValue: user.GLN,
        loginProvider: 'AMA',
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: user.bewname,
          address: user.bewadr,
          identifierValue: user.GLN,
        },
      });
    await setUserSession(event, {
      user: {
        login: user.betriebsnummern,
      },
      loggedInAt: Date.now(),
    });

    deleteCookie(event, 'login-retry');
    return sendRedirect(event, '/account');
  } catch (error) {
    console.error('AMA login error:', error);
    setCookie(event, 'login-retry', 'true', {
      expires: new Date(Date.now() + 10000),
      secure: true,
    });
    throw createError({
      status: 500,
      statusMessage: 'Internal Server Error',
      message: /** @type {Error} */ (error).message || 'AMA login failed. Please try again.',
    });
  }
});
