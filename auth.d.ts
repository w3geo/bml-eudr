declare module "#auth-utils" {
  interface User {
    login: string;
  }

  interface UserSession {
    loggedInAt: number;
  }

  // interface SecureSessionData {
  //   // Add your own fields
  // }
}

export {};
