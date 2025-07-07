import { getRequestURL } from 'h3';
import { FetchError } from 'ofetch';
import { snakeCase, upperFirst } from 'scule';
import { createError } from '#imports';

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
 * @property {string} redirect_uri
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
     * For a better error handling, only unauthorized errors are intercepted, and other errors are re-thrown.
     */
    if (error instanceof FetchError && error.status === 401) {
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
  return onError(event, error);
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
  return onError(event, error);
}
