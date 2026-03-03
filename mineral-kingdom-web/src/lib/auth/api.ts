// src/lib/auth/api.ts
export type LoginRequest = { email: string; password: string };

// What the BFF code wants everywhere:
export type TokenResponse = { access_token: string; refresh_token: string };

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function normalizeTokens(json: unknown): TokenResponse {
  if (!isRecord(json)) {
    throw new Error("Auth API returned non-object JSON");
  }

  const access =
    getString(json, "access_token") ??
    getString(json, "accessToken") ??
    getString(json, "access") ??
    getString(json, "token");

  const refresh =
    getString(json, "refresh_token") ??
    getString(json, "refreshToken") ??
    getString(json, "refresh");

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

  const json: unknown = await res.json();
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

  const json: unknown = await res.json();
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