import { eq } from 'drizzle-orm';
import lfbisFarm from '~~/server/db/schema/lfbis_farm';
import lfbisField from '~~/server/db/schema/lfbis_field';

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  if (!session?.user?.login) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }
  if (session.loginProvider !== 'AMA') {
    //throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  const query = getQuery(event);
  const layer = query.layer;

  let table;
  if (layer === 'farms') {
    table = lfbisFarm;
  } else if (layer === 'fields') {
    table = lfbisField;
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Invalid layer' });
  }

  const db = useDb();
  return await db
    .select({ localId: table.localId })
    .from(table)
    .where(eq(table.lfbis, session.user.login));
});
