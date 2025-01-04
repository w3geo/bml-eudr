export default defineEventHandler(async (event) => {
  // Try to read request body
  const body = await readBody(event).catch(() => {});
  console.log('AMA login', body);
  if (await deleteCid(body.cid)) {
    try {
      const response = await fetch(
        'https://restds.services.ama.at:443/webservice-zlb-partnerseitenlogin/PartnerseitenLoginService/metadatenHolen',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            tokenKey: body.token,
            partnerseite: 'ps_eudr_bml',
          }),
        },
      );
      if (response.ok) {
        console.log('AMA data', await response.json());
      }
    } catch (error) {
      console.error('AMA error', error);
    }

    await setUserSession(event, {
      user: {
        login: 'AMA User',
      },
      loggedInAt: Date.now(),
    });

    return sendRedirect(event, '/');
  }
});
