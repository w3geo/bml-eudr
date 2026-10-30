export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }

  const { statements, error } = await retrieveSdByInternalReference(userId);
  if (error) {
    throw createError({ status: 500, statusMessage: 'Internal Server Error', message: error });
  }
  // Only statements waiting for TRACES to issue a reference number lack one. Others, e.g. withdrawn
  // ones, have had their reference and verification numbers removed and can no longer be loaded.
  const sdInfo = statements?.filter((sd) => sd.referenceNumber || sd.status === 'SUBMITTED');
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
