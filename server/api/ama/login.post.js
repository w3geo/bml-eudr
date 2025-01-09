import { request } from 'https';

export default defineEventHandler(async (event) => {
  // Try to read request body
  const body = await readBody(event).catch(() => {});
  console.log('AMA login', body);
  if (await deleteCid(body.cid)) {
    setTimeout(() => {
      try {
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
        const req = request(options, (res) => {
          console.log(res.statusCode);
          /** @type {Array<Buffer>} */
          const chunks = [];
          res.on('data', function (d) {
            chunks.push(d);
          });
          res.on('end', () => {
            console.log(Buffer.concat(chunks).toString());
          });
        });
        req.write(
          JSON.stringify({
            tokenKey: body.token,
            partnerseite: 'ps_eudr_bml',
          }),
        );
        req.end();
      } catch (error) {
        console.error('AMA error', error);
      }
    }, 1000);

    await setUserSession(event, {
      user: {
        login: 'AMA User',
      },
      loggedInAt: Date.now(),
    });

    return sendRedirect(event, '/');
  }
});
