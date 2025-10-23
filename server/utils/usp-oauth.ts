import type { H3Event } from 'h3';
import { eventHandler, getQuery, sendRedirect } from 'h3';
import { withQuery } from 'ufo';
import { defu } from 'defu';
import {
  handleMissingConfiguration,
  handleAccessTokenErrorResponse,
  getOAuthRedirectURL,
  requestAccessToken,
} from './utils';
import { createError } from '#imports';
import type { OAuthConfig } from '#auth-utils';
import { decodeJwt } from 'jose';

export interface OAuthUSPConfig {
  /**
   * USP OAuth Client ID
   * @default process.env.NUXT_OAUTH_USP_CLIENT_ID
   */
  clientId?: string;
  /**
   * USP OAuth Client Secret
   * @default process.env.NUXT_OAUTH_USP_CLIENT_SECRET
   */
  clientSecret?: string;
  /**
   * USP OAuth Scope
   * @default []
   * @see https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps
   * @example ['user:email']
   */
  scope?: string[];
  /**
   * Require email from user, adds the ['user:email'] scope if not present
   * @default false
   */
  emailRequired?: boolean;

  /**
   * USP OAuth Authorization URL
   * @default 'https://eid2.oesterreich.gv.at/auth/idp/profile/oidc/authorize'
   */
  authorizationURL?: string;

  /**
   * USP OAuth Token URL
   * @default 'https://eid2.oesterreich.gv.at/auth/idp/profile/oidc/token'
   */
  tokenURL?: string;

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#1-request-a-users-github-identity
   * @example { allow_signup: 'true' }
   */
  authorizationParams?: Record<string, string>;

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * @default process.env.NUXT_OAUTH_USP_REDIRECT_URL
   * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps
   */
  redirectURL?: string;
}

export function defineOAuthUSPEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthUSPConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, {
      clientId: process.env.NUXT_OAUTH_USP_CLIENT_ID,
      clientSecret: process.env.NUXT_OAUTH_USP_CLIENT_SECRET,
      authorizationURL:
        process.env.NUXT_OAUTH_USP_AUTHORIZATION_URL ||
        //FIXME Set correct default
        'https://eid2.oesterreich.gv.at/auth/idp/profile/oidc/authorize',
      tokenURL:
        process.env.NUXT_OAUTH_USP_TOKEN_URL ||
        //FIXME Set correct default
        'https://eid2.oesterreich.gv.at/auth/idp/profile/oidc/token',
      authorizationParams: {},
    }) as OAuthUSPConfig;

    const query = getQuery<{ code?: string; error?: string }>(event);

    console.log('Query', query);
    if ('logout' in query) {
      const requestURL = getRequestURL(event);
      await clearUserSession(event);
      const idToken = (await getUserSession(event)).secure?.idToken;
      return sendRedirect(
        event,
        withQuery('https://sso.usp.gv.at/realms/usp-clients/protocol/openid-connect/logout', {
          id_token_hint: idToken,
          client_id: config.clientId,
          post_logout_redirect_uri: `${requestURL.protocol}//${requestURL.host}/`,
        }),
      );
    }

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `USP login failed: ${query.error || 'Unknown error'}`,
        data: query,
      });
      if (!onError) throw error;
      return onError(event, error);
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'usp', ['clientId', 'clientSecret'], onError);
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event);

    if (!query.code) {
      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code id_token',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope?.join(' '),
          ...config.authorizationParams,
        }),
      );
    }

    const tokens = await requestAccessToken(config.tokenURL as string, {
      body: {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectURL,
        code: query.code,
      },
    });

    if (tokens.error) {
      return handleAccessTokenErrorResponse(event, 'usp', tokens, onError);
    }

    const tokenData = decodeJwt(tokens.access_token);

    const user = {
      login: tokenData['urn:pvpgvat:oidc.ou_gv_ou_id'],
      name: tokenData['urn:pvpgvat:oidc.ou'],
      streetAddress: tokenData['urn:uspgvat:enterprise_street_address'],
      houseNumber: tokenData['urn:uspgvat:enterprise_house_number'],
      postalCode: tokenData['urn:uspgvat:enterprise_postal_code'],
      locality: tokenData['urn:uspgvat:enterprise_locality'],
      enterpriseKeys: tokenData['urn:uspgvat:enterprise_keys'],
    };

    return onSuccess(event, {
      user,
      tokens,
    });
  });
}
