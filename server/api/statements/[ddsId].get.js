export default defineEventHandler(async (event) => {
  const userId = (await requireUserSession(event)).user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }
  const ddsId = getRouterParam(event, 'ddsId');
  if (!ddsId) {
    throw createError({ status: 400, statusMessage: 'Bad Request' });
  }

  const ddsInfos = await retrieveDDS([ddsId]);
  if (!ddsInfos) {
    throw createError({
      status: 404,
      statusMessage: 'Not found',
    });
  }

  const ddsInfo = ddsInfos[0];

  if (!ddsInfo?.referenceNumber || !ddsInfo?.verificationNumber) {
    return ddsInfo;
  }

  const { commodities, error } = await retrieveDDSData(
    ddsInfo.referenceNumber,
    ddsInfo.verificationNumber,
  );

  if (error) {
    throw createError({
      status: 500,
      statusMessage: 'Failed to retrieve DDS data',
      message: error,
    });
  }

  return { ...ddsInfo, commodities };
});
