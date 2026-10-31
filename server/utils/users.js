import { and, isNull, lt, or } from 'drizzle-orm';
import users from '../db/schema/users';

/** Users who did not log in for this long are deleted, same as the retention of statement copies. */
export const INACTIVE_USER_YEARS = 5;

/** Users whose OTP login was never verified, e.g. a code requested for someone else's address. */
const UNVERIFIED_USER_HOURS = 24;

/**
 * Delete inactive and unverified users. Statement copies are kept, because they are not linked to
 * users and expire on their own; after a new login, they are found again via TRACES.
 * @returns {Promise<number>} number of deleted users
 */
export async function deleteStaleUsers() {
  const inactiveCutoff = new Date();
  inactiveCutoff.setFullYear(inactiveCutoff.getFullYear() - INACTIVE_USER_YEARS);
  const unverifiedCutoff = new Date(Date.now() - UNVERIFIED_USER_HOURS * 60 * 60 * 1000);
  const deleted = await useDb()
    .delete(users)
    .where(
      or(
        lt(users.lastLoginAt, inactiveCutoff),
        and(isNull(users.lastLoginAt), lt(users.createdAt, unverifiedCutoff)),
      ),
    )
    .returning();
  return deleted.length;
}
