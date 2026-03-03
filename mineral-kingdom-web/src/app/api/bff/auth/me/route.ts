import { NextResponse } from "next/server";
import { getAccessToken, getRefreshToken, setAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";
import { apiRefresh } from "@/lib/auth/api";
import { decodeJwt, extractEmail, extractUserId, extractRoles, extractEmailVerified } from "@/lib/auth/jwt";

function buildMe(accessToken: string) {
  const payload = decodeJwt(accessToken);
  if (!payload) return { isAuthenticated: false, user: null, roles: [] as string[] };

  return {
    isAuthenticated: true,
    user: { id: extractUserId(payload), email: extractEmail(payload) },
    roles: extractRoles(payload),
    emailVerified: extractEmailVerified(payload),
  };
}

export async function GET() {
  const access = await getAccessToken();
  if (access) return NextResponse.json(buildMe(access));

  const refresh = await getRefreshToken();
  if (!refresh) return NextResponse.json({ isAuthenticated: false, user: null, roles: [] });

  try {
    const tokens = await apiRefresh(refresh);
    await setAuthCookies(tokens);
    return NextResponse.json(buildMe(tokens.access_token));
  } catch {
    await clearAuthCookies();
    return NextResponse.json({ isAuthenticated: false, user: null, roles: [] }, { status: 401 });
  }
}