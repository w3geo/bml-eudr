import type { IdentifierType } from '~/utils/utils';
import type { CommodityDataWithKey } from '../server/utils/soap-traces';
import type { LoginProvider } from './utils/constants';

declare module '#auth-utils' {
  interface User {
    login: string;
  }

  interface UserSession {
    loggedInAt: number;
    loginProvider: LoginProvider;
    commodities?: Record<string, Array<CommodityDataWithKey>>;
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
