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

export interface OAuthIdAustriaConfig {
  /**
   * IdAustria OAuth Client ID
   * @default process.env.NUXT_OAUTH_IDAUSTRIA_CLIENT_ID
   */
  clientId?: string;
  /**
   * IdAustria OAuth Client Secret
   * @default process.env.NUXT_OAUTH_IDAUSTRIA_CLIENT_SECRET
   */
  clientSecret?: string;
  /**
   * IdAustria OAuth Scope
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
   * IdAustria OAuth Authorization URL
   * @default 'https://eid2.oesterreich.gv.at/auth/idp/profile/oidc/authorize'
   */
  authorizationURL?: string;

  /**
   * IdAustria OAuth Token URL
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
   * @default process.env.NUXT_OAUTH_IDAUSTRIA_REDIRECT_URL
   * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps
   */
  redirectURL?: string;
}

export function defineOAuthIdAustriaEventHandler({
  config,
  onSuccess,
  onError,
}: OAuthConfig<OAuthIdAustriaConfig>) {
  return eventHandler(async (event: H3Event) => {
    config = defu(config, {
      clientId: process.env.NUXT_OAUTH_IDAUSTRIA_CLIENT_ID,
      clientSecret: process.env.NUXT_OAUTH_IDAUSTRIA_CLIENT_SECRET,
      authorizationURL:
        process.env.NUXT_OAUTH_IDAUSTRIA_AUTHORIZATION_URL ||
        'https://eid2.oesterreich.gv.at/auth/idp/profile/oidc/authorize',
      tokenURL:
        process.env.NUXT_OAUTH_IDAUSTRIA_TOKEN_URL ||
        'https://eid2.oesterreich.gv.at/auth/idp/profile/oidc/token',
      authorizationParams: {},
    }) as OAuthIdAustriaConfig;

    const query = getQuery<{ code?: string; error?: string }>(event);

    if (query.error) {
      const error = createError({
        statusCode: 401,
        message: `IdAustria login failed: ${query.error || 'Unknown error'}`,
        data: query,
      });
      if (!onError) throw error;
      return onError(event, error);
    }

    if (!config.clientId || !config.clientSecret) {
      return handleMissingConfiguration(event, 'idaustria', ['clientId', 'clientSecret'], onError);
    }

    const redirectURL = config.redirectURL || getOAuthRedirectURL(event);

    if (!query.code) {
      config.scope = config.scope || ['openid', 'profile', 'eid'];
      // if (config.emailRequired && !config.scope.includes("user:email")) {
      //   config.scope.push("user:email");
      // }

      return sendRedirect(
        event,
        withQuery(config.authorizationURL as string, {
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: redirectURL,
          scope: config.scope.join(' '),
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
      return handleAccessTokenErrorResponse(event, 'idaustria', tokens, onError);
    }

    const tokenData = await decodeJwt(tokens.id_token);

    const user = {
      login: tokenData['urn:pvpgvat:oidc.bpk'],
      firstName: tokenData.given_name,
      lastName: tokenData.family_name,
    };
    const meldeadresse = tokenData['urn:eidgvat:attributes.mainAddress'];
    if (!meldeadresse) {
      const error = createError({
        statusCode: 401,
        message:
          'Kein Login mit diesem Account möglich. Österreichische Meldeadresse erforderlich. Bitte verwenden Sie einen anderen Account.',
      });
      if (onError) {
        return onError(event, error);
      }
      throw error;
    }
    Object.assign(
      user,
      JSON.parse(
        new TextDecoder().decode(Uint8Array.from(atob(meldeadresse), (m) => m.codePointAt(0))),
      ),
    );

    return onSuccess(event, {
      user,
      tokens,
    });
  });
}
