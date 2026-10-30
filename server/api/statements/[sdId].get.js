export default defineEventHandler(async (event) => {
  const userId = (await requireUserSession(event)).user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }
  const sdId = getRouterParam(event, 'sdId');
  if (!sdId) {
    throw createError({ status: 400, statusMessage: 'Bad Request' });
  }

  const { statements: sdInfos, error: sdError } = await retrieveSd([sdId]);
  if (sdError) {
    throw createError({ status: 500, statusMessage: 'Internal Server Error', message: sdError });
  }
  const sdInfo = sdInfos?.[0];
  // TRACES returns any statement submitted through our account, so only hand out the user's own.
  if (!sdInfo || sdInfo.internalReferenceNumber !== getInternalReferenceHash(userId)) {
    throw createError({
      status: 404,
      statusMessage: 'Not found',
    });
  }
  delete sdInfo.internalReferenceNumber;

  if (isInvalidated(sdInfo)) {
    await deleteStatementContents([sdId]);
    throw createError({
      status: 404,
      statusMessage: 'Not found',
      message: 'Diese Erklärung ist im EU-Informationssystem TRACES nicht mehr verfügbar.',
    });
  }

  // Statements submitted before copies were kept have no contents.
  const contents = await loadStatementContents(sdId);
  return { ...sdInfo, commodities: [], ...contents };
});
