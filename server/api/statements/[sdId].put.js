export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }
  const sdId = getRouterParam(event, 'sdId');
  if (!sdId) {
    throw createError({ status: 400, statusMessage: 'Bad Request' });
  }
  /** @type {import('~~/server/utils/soap-traces').StatementPayload} */
  const statement = await readBody(event);
  const { user, cattleCount, lfbis } = validateStatement(session, statement);
  const { commodities, geolocationVisible } = statement;

  const sdInfo = await requireOwnStatement(sdId, userId);
  requireModifiable(sdInfo);
  const previous = await loadStatementContents(sdId).catch((error) => {
    console.error('Failed to load statement contents', sdId, error);
    return undefined;
  });

  const { version, error } = await updateSD(sdId, commodities, geolocationVisible, user);
  if (error) {
    throw createError({ status: 500, statusMessage: 'Internal Server Error', message: error });
  }

  if (cattleCount || getCattleCount(previous?.commodities)) {
    if (lfbis) {
      await queueCattle({ sdId, lfbis, count: cattleCount });
    } else {
      console.error('Cattle count changed without LFBIS, not sent to AMA', sdId);
    }
  }

  try {
    await storeStatementContents(
      sdId,
      commodities,
      geolocationVisible,
      version ?? (sdInfo.version ?? 1) + 1,
    );
  } catch (error) {
    console.error('Failed to store statement contents', sdId, error);
  }

  return sendNoContent(event, 204);
});
