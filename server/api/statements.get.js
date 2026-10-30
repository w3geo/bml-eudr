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
  const invalidated = statements?.filter(isInvalidated) ?? [];
  try {
    await deleteStatementContents(invalidated.map((sd) => sd.sdId));
  } catch (error) {
    // The cleanup task will try again.
    console.error('Failed to delete contents of invalidated statements', error);
  }

  return statements?.filter((sd) => !isInvalidated(sd));
});
