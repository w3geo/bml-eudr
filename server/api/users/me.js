import { eq } from 'drizzle-orm';
import { editableUserDataFields, LOGIN_PROVIDED_FIELDS } from '~~/shared/utils/constants';
import { isUserDataValid } from '~~/shared/utils/utils';
import users from '~~/server/db/schema/users';

export default defineEventHandler(async (event) => {
  if (!['GET', 'PUT', 'DELETE'].includes(event.method)) {
    throw createError({ status: 405, statusMessage: 'Method Not Allowed' });
  }

  const session = await requireUserSession(event);
  const userId = session.user.login;
  const db = useDb();

  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!session.secure) {
    throw createError({ status: 500, statusMessage: 'User session is missing secure data' });
  }

  if (event.method === 'GET') {
    return {
      id: userId,
      loginProvider: session.loginProvider,
      name: session.secure.name,
      address: session.secure.address,
      identifierType: session.secure.identifierType,
      identifierValue: session.secure.identifierValue,
      lfbis: session.secure.lfbis,
      otp: user?.otp ?? null,
    };
  }

  if (event.method === 'DELETE') {
    // Statement copies are not linked to the user in our database, so find them via TRACES.
    // Fail before deleting anything when that is not possible, so the user can try again.
    const { statements, error } = await retrieveSdByInternalReference(userId);
    if (error) {
      throw createError({ status: 500, statusMessage: 'Internal Server Error', message: error });
    }
    await deleteStatementContents(statements?.map((s) => s.sdId) ?? []);
    await db.delete(users).where(eq(users.id, userId));
    // The client logs out, because a USP logout needs the session.
    return sendNoContent(event);
  }

  if (event.method === 'PUT' && event.headers.get('content-type') === 'application/json') {
    /** @type {import('~~/server/db/schema/users.js').User} */
    /** @type {Record<string, any>} */
    const body = await readBody(event);
    // Only editable fields, so e.g. lastLoginAt or otp cannot be set by the client
    const properties = /** @type {import('~~/server/db/schema/users.js').User} */ (
      Object.fromEntries(
        editableUserDataFields.filter((key) => key in body).map((key) => [key, body[key]]),
      )
    );
    if (!isUserDataValid(properties)) {
      throw createError({ status: 400, statusMessage: 'Invalid user data' });
    }
    const loginProvidedFields = LOGIN_PROVIDED_FIELDS[session.loginProvider] || [];
    await setUserSession(event, {
      user: session.user,
      loginProvider: session.loginProvider,
      loggedInAt: session.loggedInAt,
      secure: {
        ...session.secure,
        // Fields provided by the login cannot be changed, e.g. the LFBIS number of an SMS login,
        // which is used for submitting cattle
        ...Object.fromEntries(
          editableUserDataFields
            .filter((key) => !loginProvidedFields.includes(/** @type {any} */ (key)))
            .map((key) => [
              key,
              properties[/** @type {keyof typeof properties} */ (key)] ?? undefined,
            ]),
        ),
      },
    });
    for (const property of loginProvidedFields) {
      // clear properties provided by login
      delete properties[property];
    }
    let noProperties = true;
    for (const key of editableUserDataFields) {
      if (key in properties) {
        noProperties = false;
        break;
      }
    }
    if (noProperties) {
      return;
    }
    await db
      .update(users)
      .set({ ...user, ...properties })
      .where(eq(users.id, userId));
  }
});
