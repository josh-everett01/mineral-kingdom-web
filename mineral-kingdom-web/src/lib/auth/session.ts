import { getAccessToken, getRefreshToken, setAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";
import { apiRefresh } from "@/lib/auth/api";
import {
  decodeJwt,
  extractEmail,
  extractEmailVerified,
  extractRoles,
  extractUserId,
} from "@/lib/auth/jwt";

export type AppRole = "USER" | "STAFF" | "OWNER" | string;

export type AppSession = {
  isAuthenticated: boolean;
  user: { id: string | null; email: string | null } | null;
  roles: AppRole[];
  emailVerified?: boolean;
};

function buildSession(accessToken: string): AppSession {
  const payload = decodeJwt(accessToken);

  if (!payload) {
    return {
      isAuthenticated: false,
      user: null,
      roles: [],
    };
  }

  return {
    isAuthenticated: true,
    user: {
      id: extractUserId(payload) ?? null,
      email: extractEmail(payload) ?? null,
    },
    roles: extractRoles(payload),
    emailVerified: extractEmailVerified(payload),
  };
}

export async function getCurrentSession(): Promise<AppSession> {
  const access = await getAccessToken();
  if (access) {
    return buildSession(access);
  }

  const refresh = await getRefreshToken();
  if (!refresh) {
    return {
      isAuthenticated: false,
      user: null,
      roles: [],
    };
  }

  try {
    const tokens = await apiRefresh(refresh);
    await setAuthCookies(tokens);
    return buildSession(tokens.access_token);
  } catch {
    await clearAuthCookies();
    return {
      isAuthenticated: false,
      user: null,
      roles: [],
    };
  }
}

export function hasAnyRole(session: AppSession, allowedRoles: readonly string[]): boolean {
  if (!session.isAuthenticated) return false;

  const granted = new Set(session.roles);
  return allowedRoles.some((role) => granted.has(role));
}