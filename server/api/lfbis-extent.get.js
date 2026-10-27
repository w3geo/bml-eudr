import { eq } from 'drizzle-orm';
import lfbisField from '~~/server/db/schema/lfbis_field';

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  if (!session?.user?.login) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }
  const lfbis = getFieldsLfbis(session);
  if (!lfbis) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  const db = useDb();
  const localIds = await db
    .select({ localId: lfbisField.localId })
    .from(lfbisField)
    .where(eq(lfbisField.lfbis, lfbis));

  return getExtentForLocalIds(localIds.map((r) => r.localId));
});
