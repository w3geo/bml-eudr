export default defineEventHandler(async (event) => {
  // eAMA only knows the production callback URL. The origin in the cid tells production
  // to forward the callback here (see server/api/ama/login.post.js).
  const cid = createAmaCid(getPublicOrigin(event));
  setCookie(event, 'eama-cid', cid, {
    httpOnly: true,
    secure: true,
    // The callback is a cross-site POST from eAMA (and from production, when forwarded).
    sameSite: 'none',
    expires: new Date(Date.now() + 60000),
  });
  return sendRedirect(
    event,
    `https://login.ama.gv.at/amaloginserver/#/?src=ps_eudr_bml&app=ps_eudr_bml&cid=${cid}`,
    302,
  );
});
