import { request } from 'https';
import { getUser, putUser } from '~/server/db/users';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (body.cid && (await deleteCid(body.cid))) {
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
        Accept: 'application/json',
        Authorization: `Basic ${base64}`,
      },
    };
    const { partnerseitenDaten: user } = await new Promise((resolve, reject) => {
      const req = request(options, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Request failed with status code ${res.statusCode}`));
        }
        /** @type {Array<Buffer>} */
        const chunks = [];
        res.on('data', function (d) {
          chunks.push(d);
        });
        res.on('end', () => {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
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
    if (!(await getUser(user.betriebsnummern))) {
      await putUser({
        id: user.betriebsnummern,
        name: user.bewname,
        address: user.bewadr,
        email: null,
        emailverified: 0,
        identifiertype: 'GLN',
        identifiervalue: user.GLN,
        loginprovider: 'AMA',
      });
    }
    await setUserSession(event, {
      user: {
        login: user.betriebsnummern,
      },
      loggedInAt: Date.now(),
    });

    return sendRedirect(event, '/');
  }
});
