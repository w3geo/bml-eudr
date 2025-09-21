import users from '../db/schema/users';
import { and, eq } from 'drizzle-orm';
import statements from '../db/schema/statements';
import amaCattle from '../db/schema/ama_cattle';
import { unref } from 'vue';

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  let userId = session.user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }
  /** @type {import('~~/server/utils/soap-traces').StatementData & { onBehalfOf?: string, token?: string }} */
  const { onBehalfOf, token, ...statement } = await readBody(event);

  const db = useDb();

  let onBehalfOfUser;
  if (onBehalfOf && token) {
    [onBehalfOfUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, String(onBehalfOf)), eq(users.statementToken, String(token))));
    if (!onBehalfOfUser) {
      throw createError({ status: 403, statusMessage: 'Forbidden' });
    }
    await db.update(users).set({ statementToken: null }).where(eq(users.id, onBehalfOfUser.id));
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, onBehalfOfUser ? onBehalfOfUser.id : userId));
  if (!user) {
    throw createError({ status: 404, statusMessage: 'User not found' });
  }

  const commodities = statement.commodities;
  const cattleCount = commodities.reduce((sum, c) => {
    const quantity = unref(c.quantity);
    return (quantity['010221'] || 0) + (quantity['010229'] || 0) + sum;
  }, 0);

  const { ddsId, error } = await submitDDS(commodities, statement.geolocationVisible, user);
  if (error) {
    throw createError({ status: 500, statusMessage: 'Internal Server Error', message: error });
  }
  if (!ddsId) {
    throw createError({
      status: 500,
      statusMessage: 'Internal Server Error',
      message: 'No ddsId returned',
    });
  }

  /** @type {Array<Promise<*>>} */
  const promises = [
    db.insert(statements).values({
      ddsId,
      userId: onBehalfOfUser ? onBehalfOfUser.id : userId,
      author: onBehalfOfUser ? userId : null,
      date: new Date(),
    }),
  ];
  if (cattleCount && user.loginProvider === 'AMA') {
    promises.push(
      db.insert(amaCattle).values({
        ddsId,
        userId,
        count: cattleCount,
      }),
    );
  }
  await Promise.all(promises);
  if (!onBehalfOfUser) {
    await setUserSession(event, {
      ...session,
      commodities: {
        ...session.commodities,
        [ddsId]: commodities.map((c) => ({
          key: c.key,
          quantity: c.quantity,
          geojson: {
            type: 'FeatureCollection',
            features: unref(c.geojson).features.map((f) => ({
              type: 'Feature',
              properties: { Area: f.properties?.Area },
              geometry: null,
            })),
          },
        })),
      },
    });
  }

  return sendNoContent(event, 201);
});
