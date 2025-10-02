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

  /** @type {import('~~/server/utils/soap-traces').User} */
  let user;
  if (onBehalfOfUser) {
    const [userFromDb] = await db.select().from(users).where(eq(users.id, onBehalfOfUser.id));
    if (!userFromDb) {
      throw createError({ status: 404, statusMessage: 'On-behalf-of user not found' });
    }
    if (
      !userFromDb.name ||
      !userFromDb.address ||
      !userFromDb.identifierType ||
      !userFromDb.identifierValue
    ) {
      throw createError({
        status: 400,
        statusMessage: 'On-behalf-of user is missing required fields',
      });
    }
    user = {
      id: userFromDb.id,
      name: userFromDb.name,
      address: userFromDb.address,
      identifierType: userFromDb.identifierType,
      identifierValue: userFromDb.identifierValue,
    };
  } else {
    if (!session.secure) {
      throw createError({ status: 400, statusMessage: 'User is missing required fields' });
    }
    user = {
      id: session.user.login,
      ...session.secure,
    };
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
  const promises = [];
  if (onBehalfOfUser) {
    promises.push(
      db.insert(statements).values({
        ddsId,
        userId: onBehalfOfUser.id,
        authorName: /** @type {string} */ (session.secure?.name),
        authorAddress: /** @type {string} */ (session.secure?.address),
        date: new Date(),
      }),
    );
  }
  if (!onBehalfOfUser && cattleCount && session.loginProvider === 'AMA') {
    promises.push(
      db.insert(amaCattle).values({
        ddsId,
        lfbis: userId,
        count: cattleCount,
      }),
    );
  }
  await Promise.all(promises);
  if (!onBehalfOfUser) {
    await setUserSession(event, {
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
