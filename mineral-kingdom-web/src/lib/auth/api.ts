// src/lib/auth/api.ts
export type LoginRequest = { email: string; password: string };

// What the BFF code wants to work with everywhere:
export type TokenResponse = { access_token: string; refresh_token: string };

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

function normalizeTokens(json: any): TokenResponse {
  // Supports snake_case or camelCase (and a couple common variants)
  const access =
    json?.access_token ??
    json?.accessToken ??
    json?.access ??
    json?.token ??
    null;

  const refresh =
    json?.refresh_token ??
    json?.refreshToken ??
    json?.refresh ??
    null;

  if (!access || !refresh) {
    throw new Error("Auth API did not return access/refresh tokens in expected shape");
  }

  return { access_token: access, refresh_token: refresh };
}

export async function apiLogin(body: LoginRequest): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Login failed (${res.status})`);
  }

  const json = await res.json();
  return normalizeTokens(json);
}

export async function apiRefresh(refresh_token: string): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Refresh failed (${res.status})`);
  }

  const json = await res.json();
  return normalizeTokens(json);
}

export async function apiLogout(refresh_token: string): Promise<void> {
  await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token }),
    cache: "no-store",
  }).catch(() => {});
}