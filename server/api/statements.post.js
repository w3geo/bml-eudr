export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }
  /** @type {import('~~/server/utils/soap-traces').StatementPayload} */
  const statement = await readBody(event);
  const { user, cattleCount, lfbis } = validateStatement(session, statement);
  const { commodities, geolocationVisible } = statement;

  const { sdId, error } = await submitSD(commodities, geolocationVisible, user);
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

  if (cattleCount && lfbis) {
    await queueCattle({ sdId, lfbis, count: cattleCount });
  }

  try {
    await storeStatementContents(sdId, commodities, geolocationVisible);
  } catch (error) {
    // The statement was submitted nevertheless, so don't report an error to the user.
    console.error('Failed to store statement contents', sdId, error);
  }

  return sendNoContent(event, 201);
});
