export default defineEventHandler(async (event) => {
  const userId = (await requireUserSession(event)).user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }
  const sdId = getRouterParam(event, 'sdId');
  if (!sdId) {
    throw createError({ status: 400, statusMessage: 'Bad Request' });
  }

  const sdInfo = await requireOwnStatement(sdId, userId);

  // Statements submitted before copies were kept have no contents.
  const contents = await loadStatementContents(sdId);
  if (!contents) {
    return { ...sdInfo, commodities: [] };
  }
  const { version: contentsVersion = 1, ...rest } = contents;
  return { ...sdInfo, ...rest, contentsVersion };
});
