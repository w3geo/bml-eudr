export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }

  const { statements: sdInfo, error } = await retrieveSdByInternalReference(userId);
  if (error) {
    throw createError({ status: 500, statusMessage: 'Internal Server Error', message: error });
  }
  if (sdInfo) {
    for (const sd of sdInfo) {
      if (sd.referenceNumber && sd.verificationNumber) {
        delete session.commodities?.[sd.sdId];
      }
      sd.commodities = session.commodities?.[sd.sdId];
    }
  }

  await replaceUserSession(event, session);

  return sdInfo;
});
