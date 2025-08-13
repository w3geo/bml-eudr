import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  const cid = randomUUID();
  setCookie(event, 'eama-cid', cid, {
    httpOnly: true,
    secure: true,
    expires: new Date(Date.now() + 60000),
  });
  return sendRedirect(
    event,
    `https://login.ama.gv.at/amaloginserver/#/?src=ps_eudr_bml&app=ps_eudr_bml&cid=${cid}`,
    302,
  );
});
