import { and, eq } from 'drizzle-orm';
import users from '~~/server/db/schema/users';

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') {
    throw createError({ status: 405, statusMessage: 'Method Not Allowed' });
  }
  const query = getQuery(event);
  if (!query.onBehalfOf || !query.token) {
    throw createError({ status: 400, statusMessage: 'Bad Request' });
  }
  const session = await requireUserSession(event);
  const userId = session.user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }

  const db = useDb();
  const [onBehalfOfUser] = await db
    .select()
    .from(users)
    .where(
      and(eq(users.id, String(query.onBehalfOf)), eq(users.statementToken, String(query.token))),
    );
  if (!onBehalfOfUser) {
    throw createError({ status: 404, statusMessage: 'Not found' });
  }
  return onBehalfOfUser;
});
