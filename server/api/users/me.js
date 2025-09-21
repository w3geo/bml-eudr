import { and, eq } from 'drizzle-orm';
import { LOGIN_PROVIDED_FIELDS } from '~~/shared/utils/constants';
import users from '~~/server/db/schema/users';

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' && event.method !== 'PUT') {
    throw createError({ status: 405, statusMessage: 'Method Not Allowed' });
  }

  const session = await requireUserSession(event);
  const userId = session.user.login;
  const db = useDb();

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    throw createError({ status: 404, statusMessage: 'Not found' });
  }

  if (event.method === 'GET') {
    const query = getQuery(event);
    if (query.onBehalfOf && query.token) {
      const [onBehalfOfUser] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, String(query.onBehalfOf)),
            eq(users.statementToken, String(query.token)),
          ),
        );
      if (!onBehalfOfUser) {
        throw createError({ status: 404, statusMessage: 'Not found' });
      }
      return { ...user, ...session.secure, onBehalfOf: onBehalfOfUser };
    }
    return { ...user, ...session.secure };
  }

  if (event.method === 'PUT' && event.headers.get('content-type') === 'application/json') {
    /** @type {import('~~/server/db/schema/users.js').User} */
    const properties = await readBody(event);
    const loginProvidedFields = LOGIN_PROVIDED_FIELDS[user.loginProvider];
    for (const property of loginProvidedFields) {
      // clear properties provided by login
      delete properties[property];
    }
    await db
      .update(users)
      .set({ ...user, ...properties })
      .where(eq(users.id, userId));
  }
});
