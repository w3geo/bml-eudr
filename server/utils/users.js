import { and, eq, isNull, lt } from 'drizzle-orm';
import users from '../db/schema/users';

/** Users who did not log in for this long are deleted, along with their statement copies. */
export const INACTIVE_USER_YEARS = 5;

/** Users whose OTP login was never verified, e.g. a code requested for someone else's address. */
const UNVERIFIED_USER_HOURS = 24;

/**
 * Delete inactive and unverified users. Statement copies are not linked to users, so those of
 * inactive users are found via TRACES. If that fails, the user is kept and tried again next time.
 * Unverified users never logged in, so they cannot have submitted statements.
 * @returns {Promise<number>} number of deleted users
 */
export async function deleteStaleUsers() {
  const db = useDb();
  const inactiveCutoff = new Date();
  inactiveCutoff.setFullYear(inactiveCutoff.getFullYear() - INACTIVE_USER_YEARS);
  const unverifiedCutoff = new Date(Date.now() - UNVERIFIED_USER_HOURS * 60 * 60 * 1000);

  const unverified = await db
    .delete(users)
    .where(and(isNull(users.lastLoginAt), lt(users.createdAt, unverifiedCutoff)))
    .returning();
  let deleted = unverified.length;

  const inactive = await db
    .select({ id: users.id })
    .from(users)
    .where(lt(users.lastLoginAt, inactiveCutoff));
  for (const { id } of inactive) {
    try {
      const { statements, error } = await retrieveSdByInternalReference(id);
      if (error) {
        console.error('Inactive user: retrieving statements from TRACES failed:', error);
        continue;
      }
      await deleteStatementContents(statements ?? [], 'account inactive');
      // Unless the user logged in meanwhile
      const [user] = await db
        .delete(users)
        .where(and(eq(users.id, id), lt(users.lastLoginAt, inactiveCutoff)))
        .returning();
      if (user) {
        deleted++;
      }
    } catch (e) {
      // TRACES busy - the remaining users will be deleted by the next run.
      console.error('Inactive user: retrieving statements from TRACES failed:', e);
    }
  }
  return deleted;
}
