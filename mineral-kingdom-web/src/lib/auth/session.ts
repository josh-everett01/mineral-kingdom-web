import { getAccessToken } from "@/lib/auth/cookies"
import {
  decodeJwt,
  extractEmail,
  extractEmailVerified,
  extractRoles,
  extractUserId,
  isJwtExpired,
} from "@/lib/auth/jwt"

export type AppRole = "USER" | "STAFF" | "OWNER" | string

export type AppSession = {
  isAuthenticated: boolean
  user: { id: string | null; email: string | null } | null
  roles: AppRole[]
  emailVerified?: boolean
}

const emptySession: AppSession = {
  isAuthenticated: false,
  user: null,
  roles: [],
}

export function sessionFromAccessToken(accessToken: string): AppSession {
  const payload = decodeJwt(accessToken)

  if (!payload) {
    return emptySession
  }

  return {
    isAuthenticated: true,
    user: {
      id: extractUserId(payload) ?? null,
      email: extractEmail(payload) ?? null,
    },
    roles: extractRoles(payload),
    emailVerified: extractEmailVerified(payload),
  }
}

export async function getCurrentSession(): Promise<AppSession> {
  const access = await getAccessToken()

  if (!access) {
    return emptySession
  }

  if (isJwtExpired(access)) {
    return emptySession
  }

  return sessionFromAccessToken(access)
}

export function hasAnyRole(session: AppSession, allowedRoles: readonly string[]): boolean {
  if (!session.isAuthenticated) return false

  const granted = new Set(session.roles)
  return allowedRoles.some((role) => granted.has(role))
}