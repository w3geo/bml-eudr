import { and, desc, eq, inArray, isNull, not, or } from 'drizzle-orm';
import statements from '../db/schema/statements';

export default defineEventHandler(async (event) => {
  const userId = (await requireUserSession(event)).user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }
  const db = useDb();
  const ddsToUpdate = await db
    .select({ ddsId: statements.ddsId })
    .from(statements)
    .where(
      and(
        not(isNull(statements.ddsId)),
        eq(statements.userId, userId),
        or(isNull(statements.status), inArray(statements.status, ['SUBMITTED', 'AVAILABLE'])),
      ),
    );

  let tracesOk = true;
  try {
    const updatedDds = await retrieveDDS(ddsToUpdate.map((s) => /** @type {string} */ (s.ddsId)));
    if (updatedDds) {
      await Promise.all(
        updatedDds.map((s) =>
          db.update(statements).set(s).where(eq(statements.ddsId, s.identifier)),
        ),
      );
    }
  } catch (error) {
    tracesOk = false;
    console.error(error);
  }
  const dds = await db
    .select()
    .from(statements)
    .where(eq(statements.userId, userId))
    .orderBy(desc(statements.date));
  return tracesOk ? dds : dds.map((s) => ({ ...s, status: 'UNKNOWN' }));
});
