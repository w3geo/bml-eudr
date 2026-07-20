export default defineEventHandler(async (event) => {
  const userId = (await requireUserSession(event)).user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }
  const sdId = getRouterParam(event, 'sdId');
  if (!sdId) {
    throw createError({ status: 400, statusMessage: 'Bad Request' });
  }

  const sdInfos = await retrieveSd([sdId]);
  const sdInfo = sdInfos?.[0];
  if (!sdInfo) {
    throw createError({
      status: 404,
      statusMessage: 'Not found',
    });
  }

  if (!sdInfo.referenceNumber || !sdInfo.verificationNumber) {
    const session = await requireUserSession(event);
    sdInfo.commodities = session.commodities?.[sdInfo.sdId];
    return sdInfo;
  }

  const { commodities, geolocationVisible, error } = await retrieveSdData(
    sdInfo.referenceNumber,
    sdInfo.verificationNumber,
  );

  if (error) {
    throw createError({
      status: 500,
      statusMessage: 'Failed to retrieve SD data',
      message: error,
    });
  }

  return { ...sdInfo, commodities, geolocationVisible };
});
