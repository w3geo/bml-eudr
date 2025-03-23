import users from '../db/schema/users';
import { eq } from 'drizzle-orm';
import statements from '../db/schema/statements';

export default defineEventHandler(async (event) => {
  const userId = (await requireUserSession(event)).user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }
  const db = useDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  /** @type {import('../db/schema/statements').StatementPayload} */
  const statement = await readBody(event);
  const commodities = statement.commodities;

  const { identifier, error } = await submitDDS(commodities, user);
  if (error) {
    throw createError({ status: 500, statusMessage: 'Internal Server Error', message: error });
  }
  if (!identifier) {
    throw createError({
      status: 500,
      statusMessage: 'Internal Server Error',
      message: 'No identifier returned',
    });
  }

  await db.insert(statements).values({
    id: identifier,
    userId,
    statement,
    date: new Date(),
  });

  return sendNoContent(event, 201);
});
