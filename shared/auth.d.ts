import type { IdentifierType } from '~/utils/utils';
import type { LoginProvider } from './utils/constants';

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
    address?: string;
    identifierType?: IdentifierType;
    identifierValue?: string;
    /** LFBIS number provided by the login (eAMA, SMS, USP) */
    lfbis?: string;
    sid?: string;
  }
}

export {};
