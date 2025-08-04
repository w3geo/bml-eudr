import users from '../db/schema/users';
import { and, eq } from 'drizzle-orm';
import statements from '../db/schema/statements';

export default defineEventHandler(async (event) => {
  let userId = (await requireUserSession(event)).user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }
  /** @type {import('../db/schema/statements').StatementPayload & { onBehalfOf?: string, token?: string }} */
  const { onBehalfOf, token, ...statement } = await readBody(event);

  const db = useDb();

  if (onBehalfOf && token) {
    const [onBehalfOfUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, String(onBehalfOf)), eq(users.statementToken, String(token))));
    if (!onBehalfOfUser) {
      throw createError({ status: 403, statusMessage: 'Forbidden' });
    }
    await db.insert(statements).values({
      userId: onBehalfOfUser.id,
      author: userId,
      statement,
      date: new Date(),
    });
    await db.update(users).set({ statementToken: null }).where(eq(users.id, onBehalfOfUser.id));
    userId = onBehalfOfUser.id; // Use the onBehalfOf user for the DDS submission
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    throw createError({ status: 404, statusMessage: 'User not found' });
  }

  const commodities = statement.commodities;

  const { identifier, error } = await submitDDS(commodities, statement.geolocationVisible, user);
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
    ddsId: identifier,
    userId,
    statement,
    date: new Date(),
  });

  return sendNoContent(event, 201);
});
