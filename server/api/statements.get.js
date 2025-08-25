import { retrieveDDSByInternalReference, retrieveDDSData } from '../utils/soap-traces';

export default defineEventHandler(async (event) => {
  const userId = (await requireUserSession(event)).user.login;
  if (!userId) {
    throw createError({ status: 401, statusMessage: 'Unauthorized' });
  }

  const { statements, error } = await retrieveDDSByInternalReference(userId);

  if (error) {
    throw createError({ status: 500, statusMessage: 'Failed to retrieve DDS', message: error });
  }

  const statementData = await Promise.all(
    statements.map(async (statement) => {
      const { commodities, error } = await retrieveDDSData(
        statement.referenceNumber,
        statement.verificationNumber,
      );
      if (error) {
        throw createError({
          status: 500,
          statusMessage: 'Failed to retrieve DDS data',
          message: error,
        });
      }
      return { ...statement, statement: { commodities } };
    }),
  );
  return statementData;
});
