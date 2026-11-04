import { eq } from 'drizzle-orm';
import { editableUserDataFields, LOGIN_PROVIDED_FIELDS } from '~~/shared/utils/constants';
import { formatAddress, getInvalidUserDataFields, toPostalAddress } from '~~/shared/utils/utils';
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
      address: toPostalAddress(session.secure.address) ?? null,
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
    /** @type {Record<string, any>} */
    const body = await readBody(event);
    const loginProvidedFields = LOGIN_PROVIDED_FIELDS[session.loginProvider] || [];
    // Only editable fields, so e.g. lastLoginAt or otp cannot be set by the client. Fields provided
    // by the login cannot be changed either, e.g. the LFBIS number of an SMS login, which is used
    // for submitting cattle.
    const userFields = editableUserDataFields.filter((key) => !loginProvidedFields.includes(key));
    /** @type {Record<string, any>} */
    const values = Object.fromEntries(userFields.map((key) => [key, body[key] ?? undefined]));
    if (userFields.includes('address')) {
      values.address = toPostalAddress(values.address);
    }
    // A login-provided field that is incomplete is not the user's fault, and does not prevent
    // saving the other fields
    const invalidFields = getInvalidUserDataFields(
      { ...session.secure, address: toPostalAddress(session.secure.address), ...values },
      session.loginProvider,
    );
    if (invalidFields.some((key) => userFields.includes(key))) {
      throw createError({ status: 400, statusMessage: 'Invalid user data' });
    }
    await setUserSession(event, {
      user: session.user,
      loginProvider: session.loginProvider,
      loggedInAt: session.loggedInAt,
      secure: { ...session.secure, ...values },
    });
    if (userFields.length === 0) {
      return;
    }
    await db
      .update(users)
      .set({
        ...user,
        ...values,
        // Stored as a single string
        ...(userFields.includes('address') ? { address: formatAddress(values.address) } : {}),
      })
      .where(eq(users.id, userId));
  }
});
