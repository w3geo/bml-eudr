import type { IdentifierType } from '~/utils/utils';
import type { LoginProvider } from './utils/constants';
import type { PostalAddress } from './utils/utils';

declare module '#auth-utils' {
  interface User {
    login: string;
  }

  interface UserSession {
    loggedInAt: number;
    loginProvider: LoginProvider;
  }

  interface SecureSessionData {
    name?: string;
    /** Split at login. Sessions from before that may still carry a string, see `toPostalAddress` */
    address?: PostalAddress;
    identifierType?: IdentifierType;
    identifierValue?: string;
    /** LFBIS number provided by the login (eAMA, SMS, USP) */
    lfbis?: string;
    sid?: string;
  }
}

export {};
