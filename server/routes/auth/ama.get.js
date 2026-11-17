export default defineEventHandler(async (event) => {
  // eAMA only knows the production callback URL. The origin in the cid tells production
  // to forward the callback here (see server/api/ama/login.post.js).
  const cid = createAmaCid(getPublicOrigin(event));
  if (getQuery(event).restart !== undefined) {
    // Restarted by the callback because the eama-cid cookie was missing (see
    // server/api/ama/login.post.js). If this one comes back without the cookie too, it is not
    // restarted again.
    await rememberAmaRestart(cid);
  }
  setCookie(event, 'eama-cid', cid, {
    httpOnly: true,
    secure: true,
    // The callback is a cross-site POST from eAMA (and from production, when forwarded).
    sameSite: 'none',
    // Switching apps on a phone (e.g. for ID Austria) can take a while
    maxAge: 5 * 60,
  });
  return sendRedirect(
    event,
    `https://login.ama.gv.at/amaloginserver/#/?src=ps_eudr_bml&app=ps_eudr_bml&cid=${cid}`,
    302,
  );
});
