import { request } from 'https';

/** Restarted logins per IP address and hour, because each one is stored in the database */
const restartRateLimit = createRateLimiter(10, 60 * 60 * 1000);

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const forwardOrigin = getAmaForwardOrigin(body.cid);
    if (forwardOrigin && forwardOrigin !== getPublicOrigin(event)) {
      // Login started on another instance (e.g. staging or local dev). Forward the callback
      // with its body (307 keeps the POST), but only to an allowed origin. The target
      // instance checks the cid.
      return sendRedirect(event, `${forwardOrigin}/api/ama/login`, 307);
    }
    const expectedCid = getCookie(event, 'eama-cid');
    //TODO
    // eAMA logins on phones sometimes post back without the cid. The cookie still shows that this
    // browser started the login within the last minutes, so accept it until eAMA fixes that.
    const acceptWithoutCid = !body.cid && Boolean(expectedCid);
    if (acceptWithoutCid) {
      console.warn('eAMA login without cid, accepted because of eama-cid cookie', {
        userAgent: getRequestHeader(event, 'user-agent'),
      });
    }
    /** Why a login without eama-cid cookie was not restarted */
    let noCookieReason = '';
    let cookiesBlocked = false;
    if (body.cid && !expectedCid) {
      // The eama-cid cookie expired, because the login took longer than the cookie lives. Starting
      // the login again sets a new cookie, and eAMA should come back right away, because the user
      // just logged in there.
      const userAgent = getRequestHeader(event, 'user-agent');
      if ((await getUserSession(event)).user) {
        // E.g. a repeated callback after a successful login, which deleted the cookie
        console.warn('eAMA login without eama-cid cookie ignored, already logged in', {
          userAgent,
        });
        return sendRedirect(event, '/account');
      }
      const ip = getClientIp(event);
      if (!isAmaCidFor(body.cid, getPublicOrigin(event))) {
        noCookieReason = 'unknown cid';
      } else if (await isAmaRestart(body.cid)) {
        noCookieReason = 'still none after restart (cookies blocked?)';
        cookiesBlocked = true;
      } else if (ip && restartRateLimit(ip)) {
        // Checked last, because it counts the restart
        noCookieReason = 'restart limit reached';
      } else {
        console.warn('eAMA login without eama-cid cookie, restarting login', { userAgent });
        await rememberAmaRestart(body.cid);
        return sendRedirect(event, '/auth/ama?restart');
      }
    }
    if (!acceptWithoutCid && (!body.cid || body.cid !== expectedCid)) {
      const reason = !body.cid
        ? 'no cid from eAMA and no eama-cid cookie'
        : !expectedCid
          ? `no eama-cid cookie, ${noCookieReason}`
          : 'cid does not match eama-cid cookie';
      console.warn(`eAMA login rejected: ${reason}`, {
        userAgent: getRequestHeader(event, 'user-agent'),
      });
      setCookie(event, 'login-retry', 'true', {
        maxAge: 10,
        secure: true,
      });
      if (cookiesBlocked) {
        // The browser did not keep the cookie it just got, so it probably blocks cookies. The
        // error cookie would not be kept either, so the error goes into the URL.
        return sendRedirect(event, '/account?loginError=cookies');
      }
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
    /** @type {string} */
    const responseBody = await new Promise((resolve, reject) => {
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
          resolve(Buffer.concat(chunks).toString());
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
    console.error('AMA login error:', error);
    setCookie(event, 'login-retry', 'true', {
      maxAge: 10,
      secure: true,
    });
    const message = /** @type {Error} */ (error).message;
    if (message) {
      setCookie(event, 'login-error', message, {
        maxAge: 10,
        secure: true,
      });
    }
    return sendRedirect(event, '/account');
  }
});
