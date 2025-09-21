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
  const ddsInfo = ddsInfos?.[0];
  if (!ddsInfo) {
    throw createError({
      status: 404,
      statusMessage: 'Not found',
    });
  }

  if (!ddsInfo.referenceNumber || !ddsInfo.verificationNumber) {
    const session = await requireUserSession(event);
    ddsInfo.commodities = session.commodities?.[ddsInfo.ddsId];
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
