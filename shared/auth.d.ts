declare module '#auth-utils' {
  interface User {
    login: string;
  }

  interface UserSession {
    loggedInAt: number;
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
