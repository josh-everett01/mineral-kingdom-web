export type AuthUser = {
  id?: string;
  email?: string;
};

export type AuthMe = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  roles: string[];
  emailVerified?: boolean;
};