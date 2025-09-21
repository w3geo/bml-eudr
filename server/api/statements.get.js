import statements from '../db/schema/statements';
import { desc, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }

  const dds = await useDb()
    .select({ ddsId: statements.ddsId })
    .from(statements)
    .where(eq(statements.userId, userId))
    .orderBy(desc(statements.date));

  const ddsInfo = await retrieveDDS(dds.map((dds) => /** @type {string} */ (dds.ddsId)));
  if (ddsInfo) {
    for (const dds of ddsInfo) {
      if (dds.referenceNumber && dds.verificationNumber) {
        delete session.commodities?.[dds.ddsId];
      }
      dds.commodities = session.commodities?.[dds.ddsId];
    }
  }

  await replaceUserSession(event, session);

  return ddsInfo;
});
