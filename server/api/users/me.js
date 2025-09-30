import { and, eq } from 'drizzle-orm';
import { editableUserDataFields, LOGIN_PROVIDED_FIELDS } from '~~/shared/utils/constants';
import users from '~~/server/db/schema/users';

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' && event.method !== 'PUT') {
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
    const query = getQuery(event);
    /** @type {import('~~/server/db/schema/users.js').User|undefined} */
    let onBehalfOfUserData = undefined;
    if (query.onBehalfOf && query.token) {
      const [onBehalfOfUser] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, String(query.onBehalfOf)),
            eq(users.statementToken, String(query.token)),
          ),
        );
      if (!onBehalfOfUser) {
        throw createError({ status: 404, statusMessage: 'Not found' });
      }
      if (
        !onBehalfOfUser.name ||
        !onBehalfOfUser.address ||
        !onBehalfOfUser.identifierType ||
        !onBehalfOfUser.identifierValue
      ) {
        throw createError({
          status: 400,
          statusMessage: 'on-behalf-of user is missing required properties',
        });
      }
      onBehalfOfUserData = {
        id: onBehalfOfUser.id,
        loginProvider: onBehalfOfUser.loginProvider,
        name: onBehalfOfUser.name,
        address: onBehalfOfUser.address,
        identifierType: onBehalfOfUser.identifierType,
        identifierValue: onBehalfOfUser.identifierValue,
        otp: null,
        statementToken: null,
      };
    }
    return {
      id: userId,
      loginProvider: session.loginProvider,
      name: session.secure.name,
      address: session.secure.address,
      identifierType: session.secure.identifierType,
      identifierValue: session.secure.identifierValue,
      otp: user?.otp ?? null,
      statementToken: user?.statementToken ?? null,
      onBehalfOf: onBehalfOfUserData,
    };
  }

  if (event.method === 'PUT' && event.headers.get('content-type') === 'application/json') {
    /** @type {import('~~/server/db/schema/users.js').User} */
    const properties = await readBody(event);
    const loginProvidedFields = LOGIN_PROVIDED_FIELDS[session.loginProvider] || [];
    await setUserSession(event, {
      secure: {
        ...session.secure,
        name: properties.name,
        address: properties.address,
        identifierType: properties.identifierType,
        identifierValue: properties.identifierValue,
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
