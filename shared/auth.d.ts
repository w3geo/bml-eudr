import type { CommodityDataWithKey } from '../server/utils/soap-traces';

declare module '#auth-utils' {
  interface User {
    login: string;
  }

  interface UserSession {
    loggedInAt: number;
    commodities: Record<string, Array<CommodityDataWithKey>>;
  }

  interface SecureSessionData {
    name: string;
    email: string;
    address: string;
    identifierType: 'GLN' | 'TIN' | 'VAT';
    identifierValue: string;
  }
}

export {};
