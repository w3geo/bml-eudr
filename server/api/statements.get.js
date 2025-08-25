import statements from '../db/schema/statements';
import { desc, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const userId = (await requireUserSession(event)).user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }

  const dds = await useDb()
    .select({ ddsId: statements.ddsId })
    .from(statements)
    .where(eq(statements.userId, userId))
    .orderBy(desc(statements.date));

  const ddsInfo = await retrieveDDS(dds.map((dd) => /** @type {string} */ (dd.ddsId)));

  return ddsInfo;
});
