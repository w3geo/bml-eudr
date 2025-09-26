export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event);
  const userId = session.user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }

  const { statements: ddsInfo, error } = await retrieveDDSByInternalReference(userId);
  if (error) {
    throw createError({ status: 500, statusMessage: 'Internal Server Error', message: error });
  }
  if (ddsInfo) {
    for (const dds of ddsInfo) {
      if (dds.referenceNumber && dds.verificationNumber) {
        delete session.commodities?.[dds.ddsId];
      }
      dds.commodities = session.commodities?.[dds.ddsId];
    }
  }

  await replaceUserSession(event, session);

  return ddsInfo;
});
