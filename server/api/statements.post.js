import amaCattle from '../db/schema/ama_cattle';
import { unref } from 'vue';

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }
  /** @type {import('~~/server/utils/soap-traces').StatementData} */
  const statement = await readBody(event);

  const db = useDb();

  const secure = session.secure;
  if (
    !secure ||
    !secure.name ||
    !secure.address ||
    !secure.identifierType ||
    !secure.identifierValue
  ) {
    throw createError({ status: 400, statusMessage: 'User is missing required fields' });
  }
  /** @type {import('~~/server/utils/soap-traces').User} */
  const user = {
    id: userId,
    name: secure.name,
    address: secure.address,
    identifierType: secure.identifierType,
    identifierValue: secure.identifierValue,
  };

  const commodities = statement.commodities;
  const cattleCount = commodities.reduce((sum, c) => {
    const quantity = unref(c.quantity);
    return (quantity['010221'] || 0) + (quantity['010229'] || 0) + sum;
  }, 0);

  const { sdId, error } = await submitSD(commodities, statement.geolocationVisible, user);
  if (error) {
    throw createError({ status: 500, statusMessage: 'Internal Server Error', message: error });
  }
  if (!sdId) {
    throw createError({
      status: 500,
      statusMessage: 'Internal Server Error',
      message: 'No sdId returned',
    });
  }

  if (cattleCount && session.loginProvider === 'AMA') {
    await db.insert(amaCattle).values({
      sdId,
      lfbis: userId,
      count: cattleCount,
    });
  }

  await setUserSession(event, {
    user: session.user,
    loginProvider: session.loginProvider,
    loggedInAt: session.loggedInAt,
    commodities: {
      ...(session.commodities ?? {}),
      [sdId]: commodities.map((c) => ({
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

  return sendNoContent(event, 201);
});
