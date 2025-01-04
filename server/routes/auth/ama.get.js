import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  const cid = randomUUID();
  await addCid(cid);
  return sendRedirect(
    event,
    `https://login.ama.gv.at/amaloginserver/#/?src=ps_eudr_bml&app=ps_eudr_bml&cid=${cid}`,
    302,
  );
});
