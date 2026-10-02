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
  // TRACES returns any statement submitted through our account, so only hand out the user's own.
  if (!sdInfo || sdInfo.internalReferenceNumber !== getInternalReferenceHash(userId)) {
    throw createError({
      status: 404,
      statusMessage: 'Not found',
    });
  }
  delete sdInfo.internalReferenceNumber;

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
