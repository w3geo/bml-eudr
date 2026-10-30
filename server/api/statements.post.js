import amaCattle from '../db/schema/ama_cattle';
import { isUserDataValid } from '~~/shared/utils/utils';
import { CATTLE_LOGIN_PROVIDERS } from '~~/shared/utils/constants';

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
    !secure.identifierValue ||
    !isUserDataValid(secure)
  ) {
    throw createError({
      status: 400,
      statusMessage: 'User is missing required fields',
      message: 'Bitte vervollständigen Sie unter "Mein Konto" die Angaben zum Betrieb.',
    });
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
  if (commodities.some((c) => Object.values(c.quantity).some((v) => v < 0))) {
    throw createError({
      status: 400,
      statusMessage: 'Bad Request',
      message: 'Mengen dürfen nicht negativ sein.',
    });
  }
  const cattleCount = commodities.reduce((sum, c) => {
    const quantity = c.quantity;
    return (quantity['0102'] || 0) + sum;
  }, 0);
  const lfbis = CATTLE_LOGIN_PROVIDERS.includes(session.loginProvider) ? secure.lfbis : undefined;
  if (cattleCount && !lfbis) {
    throw createError({
      status: 403,
      statusMessage: 'Forbidden',
      message: 'Die Erfassung von Rindern ist nur mit einem eAMA Login möglich.',
    });
  }

  const { sdId, error } = await submitSD(commodities, statement.geolocationVisible, user);
  if (error) {
    throw createError({ status: 500, statusMessage: 'Internal Server Error', message: error });
  }
  if (!sdId) {
    throw createError({
      status: 500,
      statusMessage: 'Internal Server Error',
      message: UNEXPECTED_MESSAGE,
    });
  }

  if (cattleCount && lfbis && process.env.AMA_CATTLE_PATH) {
    await db.insert(amaCattle).values({
      sdId,
      lfbis,
      count: cattleCount,
    });
  }

  try {
    await storeStatementContents(sdId, commodities, statement.geolocationVisible);
  } catch (error) {
    // The statement was submitted nevertheless, so don't report an error to the user.
    console.error('Failed to store statement contents', sdId, error);
  }

  return sendNoContent(event, 201);
});
