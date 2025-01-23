import { eq } from 'drizzle-orm';
import users from '~/server/db/schema/users';

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' && event.method !== 'PUT') {
    throw createError({ status: 400, statusMessage: 'Bad Request' });
  }
  const session = await getUserSession(event);
  const userId = session.user?.login;
  if (!userId) {
    throw createError({ status: 404, statusMessage: 'Not found' });
  }
  const db = useDb();

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    throw createError({ status: 404, statusMessage: 'Not found' });
  }

  if (event.method === 'GET') {
    return user;
  }

  if (event.method === 'PUT' && event.headers.get('content-type') === 'application/json') {
    const properties = await readBody(event);
    delete properties.id;
    delete properties.name;
    delete properties.address;
    if (user.loginProvider === 'AMA') {
      delete properties.identifierType;
      delete properties.identifierValue;
    }
    await db.update(users).set(properties).where(eq(users.id, userId));
  }
});
