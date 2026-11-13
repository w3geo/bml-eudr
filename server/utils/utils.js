import { randomUUID } from 'crypto';
import { getRequestHeader, getRequestIP, getRequestURL } from 'h3';
import { FetchError } from 'ofetch';
import { snakeCase, upperFirst } from 'scule';
import { createError } from '#imports';
import { FIELDS_LOGIN_PROVIDERS } from '~~/shared/utils/constants';

/**
 * Origin of this instance, as seen by the browser.
 * @param {import('h3').H3Event} event
 * @returns {string}
 */
export function getPublicOrigin(event) {
  return getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin;
}

/**
 * The client's IP address. DigitalOcean App Platform sets `do-connecting-ip`. Clients can set
 * `x-forwarded-for` themselves, so it is only a fallback for other environments.
 * @param {import('h3').H3Event} event
 * @returns {string|undefined}
 */
export function getClientIp(event) {
  return (
    getRequestHeader(event, 'do-connecting-ip') || getRequestIP(event, { xForwardedFor: true })
  );
}

/**
 * LFBIS number for looking up the user's fields and farms, if the login provider allows that.
 * @param {import('#auth-utils').UserSession} session
 * @returns {string|undefined}
 */
export function getFieldsLfbis(session) {
  return FIELDS_LOGIN_PROVIDERS.includes(session.loginProvider) ? session.secure?.lfbis : undefined;
}

/**
 * What an address looks like, without its contents, for logging incomplete login addresses.
 * @param {import('~~/shared/utils/utils').PostalAddress} address
 * @returns {string}
 */
export function getAddressShape(address) {
  const describe = (/** @type {string} */ value) =>
    value
      .trim()
      .replace(/\p{L}+/gu, 'A')
      .replace(/\d+/g, '9')
      .replace(/\s+/g, ' ') || '(empty)';
  return `street: ${describe(address.street)}; postalCode: ${describe(address.postalCode)}; city: ${describe(address.city)}`;
}

/**
 * Creates an eAMA login `cid` that carries the origin of the instance the login started on.
 * eAMA only calls back production, which uses the origin to forward the callback.
 * @param {string} origin
 * @returns {string}
 */
export function createAmaCid(origin) {
  return `${Buffer.from(origin).toString('base64url')}.${randomUUID()}`;
}

/**
 * Whether `cid` was created by `createAmaCid` for the given origin.
 * @param {unknown} cid
 * @param {string} origin
 * @returns {cid is string}
 */
export function isAmaCidFor(cid, origin) {
  if (typeof cid !== 'string' || !/^[\w-]+\.[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(cid)) {
    return false;
  }
  return Buffer.from(cid.slice(0, cid.indexOf('.')), 'base64url').toString() === origin;
}

/** How long a restarted eAMA login is remembered, longer than the eama-cid cookie lives */
const AMA_RESTART_TTL_MS = 10 * 60 * 1000;

/**
 * Remembers an eAMA `cid` that a login was restarted for, or that a restarted login started
 * with, so a login is restarted only once. Stored in the database, because the callback can reach
 * any instance.
 * @param {string} cid
 */
export async function rememberAmaRestart(cid) {
  const storage = useStorage('db:ama-restart');
  const now = Date.now();
  for (const key of await storage.getKeys()) {
    if (now - Number(await storage.getItem(key)) > AMA_RESTART_TTL_MS) {
      await storage.removeItem(key);
    }
  }
  await storage.setItem(cid, now);
}

/**
 * Whether a login was already restarted for or with `cid`, see `rememberAmaRestart`.
 * @param {string} cid
 * @returns {Promise<boolean>}
 */
export async function isAmaRestart(cid) {
  const time = await useStorage('db:ama-restart').getItem(cid);
  return time !== null && Date.now() - Number(time) <= AMA_RESTART_TTL_MS;
}

/**
 * Returns the origin that the eAMA login callback with the given `cid` has to be forwarded
 * to, if it is one of the origins listed in `AMA_LOGIN_FORWARD_ORIGINS` (comma-separated).
 * @param {string|undefined} cid
 * @returns {string|undefined}
 */
export function getAmaForwardOrigin(cid) {
  const encoded = cid?.split('.')[0];
  if (!encoded) {
    return undefined;
  }
  const origin = Buffer.from(encoded, 'base64url').toString();
  const allowed = (process.env.AMA_LOGIN_FORWARD_ORIGINS ?? '')
    .split(',')
    .map((entry) => entry.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return allowed.find((entry) => entry === origin);
}

/**
 *
 * @param {import('h3').H3Event} event
 * @returns {string}
 */
export function getOAuthRedirectURL(event) {
  const requestURL = getRequestURL(event);

  return `${requestURL.protocol}//${requestURL.host}${requestURL.pathname}`;
}

/**
 * Request an access token body.
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
 * @typedef {Object} RequestAccessTokenBody
 * @property {"authorization_code"} grant_type
 * @property {string} code
 * @property {string} [redirect_uri]
 * @property {string} client_id
 * @property {string} [client_secret]
 * @property {Object<string, string>} [key]
 */

/**
 * @typedef {Object} RequestAccessTokenOptions
 * @property {RequestAccessTokenBody} [body]
 * @property {Object<string, string|undefined>} [params]
 * @property {Object<string, string>} [headers]
 */

/**
 * Request an access token from the OAuth provider.
 * When an error occurs, only the error data is returned.
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
 *
 * @param {string} url
 * @param {RequestAccessTokenOptions} options
 * @returns {Promise<any>}
 */
// TODO: waiting for https://github.com/atinux/nuxt-auth-utils/pull/140
export async function requestAccessToken(url, options) {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    ...options.headers,
  };

  // Encode the body as a URLSearchParams if the content type is 'application/x-www-form-urlencoded'.
  const body =
    headers['Content-Type'] === 'application/x-www-form-urlencoded'
      ? new URLSearchParams(/** @type {*} */ (options.body) || options.params || {}).toString()
      : options.body;

  return $fetch(url, {
    method: 'POST',
    headers,
    body,
  }).catch((error) => {
    /**
     * OAuth error responses (400, or 401 for invalid_client) are returned for the caller to
     * handle, other errors are re-thrown.
     */
    if (
      error instanceof FetchError &&
      (error.status === 400 || error.status === 401) &&
      error.data?.error
    ) {
      return error.data;
    }
    throw error;
  });
}

/**
 * Handle OAuth access token error response
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
 * @param {import('h3').H3Event} event
 * @param {string} oauthProvider
 * @param {any} oauthError
 * @param {import('#auth-utils').OnError} [onError]
 */
// TODO: waiting for https://github.com/atinux/nuxt-auth-utils/pull/140
export function handleAccessTokenErrorResponse(event, oauthProvider, oauthError, onError) {
  const message = `${upperFirst(oauthProvider)} login failed: ${oauthError.error_description || oauthError.error || 'Unknown error'}`;

  const error = createError({
    statusCode: 401,
    message,
    data: oauthError,
  });

  if (!onError) throw error;
  return onError(event, /** @type {import('h3').H3Error} */ (error));
}

/**
 * Handles an OAuth login callback whose code the provider rejected as `invalid_grant`, because it
 * was already used (e.g. the callback URL was loaded again) or expired. Already logged in users
 * just go to their account, others get the message to try again.
 * @param {import('h3').H3Event} event
 * @param {string} provider
 * @param {import('h3').H3Error} error
 * @returns {Promise<boolean>} whether the error was handled
 */
export async function handleInvalidGrant(event, provider, error) {
  if (/** @type {any} */ (error.data)?.error !== 'invalid_grant') {
    return false;
  }
  const loggedIn = Boolean((await getUserSession(event)).user);
  console.warn(`${provider} login code rejected as invalid_grant`, {
    loggedIn,
    description: /** @type {any} */ (error.data).error_description,
    userAgent: getRequestHeader(event, 'user-agent'),
  });
  if (!loggedIn) {
    setCookie(event, 'login-retry', 'true', {
      maxAge: 10,
      secure: true,
    });
  }
  await sendRedirect(event, '/account');
  return true;
}

/**
 * @param {import('h3').H3Event} event
 * @param {string} provider
 * @param {string[]} missingKeys
 * @param {import('#auth-utils').OnError} [onError]
 */
export function handleMissingConfiguration(event, provider, missingKeys, onError) {
  const environmentVariables = missingKeys.map(
    (key) => `NUXT_OAUTH_${provider.toUpperCase()}_${snakeCase(key).toUpperCase()}`,
  );

  const error = createError({
    statusCode: 500,
    message: `Missing ${environmentVariables.join(' or ')} env ${missingKeys.length > 1 ? 'variables' : 'variable'}.`,
  });

  if (!onError) throw error;
  return onError(event, /** @type {import('h3').H3Error} */ (error));
}
