export default defineEventHandler(async (event) => {
  // eAMA only knows the production callback URL. The origin in the cid tells production
  // to forward the callback here (see server/api/ama/login.post.js).
  const cid = createAmaCid(getPublicOrigin(event));
  const restart = getQuery(event).restart !== undefined;
  // Not logged, because that is too much log traffic. Shown to the user with the callback details
  // instead, for logins without cid (see server/api/ama/login.post.js).
  const started = {
    startedAt: new Date().toISOString(),
    cid,
    restart,
    userAgent: getRequestHeader(event, 'user-agent'),
  };
  if (restart) {
    // Restarted by the callback because the eama-cid cookie was missing (see
    // server/api/ama/login.post.js). If this one comes back without the cookie too, it is not
    // restarted again.
    await rememberAmaRestart(cid);
  }
  /** @type {Parameters<typeof setCookie>[3]} */
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    // The callback is a cross-site POST from eAMA (and from production, when forwarded).
    sameSite: 'none',
    // Switching apps on a phone (e.g. for ID Austria) can take a while
    maxAge: 5 * 60,
  };
  setCookie(event, 'eama-cid', cid, cookieOptions);
  // TODO Remove when eAMA fixed logins without cid
  setCookie(event, 'eama-started', JSON.stringify(started), cookieOptions);
  return sendRedirect(
    event,
    `https://login.ama.gv.at/amaloginserver/#/?src=ps_eudr_bml&app=ps_eudr_bml&cid=${cid}`,
    302,
  );
});
