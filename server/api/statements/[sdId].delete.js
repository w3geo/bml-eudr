import { CATTLE_LOGIN_PROVIDERS } from '~~/shared/utils/constants';

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

  const sdInfo = await requireOwnStatement(sdId, userId);
  requireModifiable(sdInfo);
  const contents = await loadStatementContents(sdId).catch((error) => {
    console.error('Failed to load statement contents', sdId, error);
    return undefined;
  });

  const { error } = await withdrawSD(sdId);
  if (error) {
    throw createError({ status: 500, statusMessage: 'Internal Server Error', message: error });
  }

  const lfbis = CATTLE_LOGIN_PROVIDERS.includes(session.loginProvider)
    ? session.secure?.lfbis
    : undefined;
  const hadCattle = getCattleCount(contents?.commodities) > 0;
  // Without a stored copy, the statement may have had cattle
  if (lfbis && (hadCattle || !contents)) {
    await queueCattle({
      sdId,
      lfbis,
      count: 0,
      referenceNumber: sdInfo.referenceNumber,
      verificationNumber: sdInfo.verificationNumber,
      date: sdInfo.date,
    });
  } else if (hadCattle) {
    console.error('Statement with cattle withdrawn without LFBIS, not sent to AMA', sdId);
  }

  return sendNoContent(event, 204);
});
