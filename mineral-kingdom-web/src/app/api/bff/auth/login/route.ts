import { NextRequest, NextResponse } from "next/server";
import { toProxyError } from "@/lib/api/proxyError";
import { setAuthCookies } from "@/lib/auth/cookies";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

type TokenResponse = {
  access_token: string;
  refresh_token: string;
};

function safeJsonParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

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
    getString(json, "AccessToken") ??
    getString(json, "access") ??
    getString(json, "token");

  const refresh =
    getString(json, "refresh_token") ??
    getString(json, "refreshToken") ??
    getString(json, "RefreshToken") ??
    getString(json, "refresh");

  if (!access || !refresh) {
    throw new Error("Auth API did not return access/refresh tokens in expected shape");
  }

  return { access_token: access, refresh_token: refresh };
}

function authErrorPayload(status: number, body: unknown) {
  const errorCode = isRecord(body) ? getString(body, "error") ?? getString(body, "code") : null;

  switch (errorCode) {
    case "INVALID_CREDENTIALS":
      return {
        status,
        code: "INVALID_CREDENTIALS",
        message: "The email or password you entered is incorrect.",
      };
    case "EMAIL_NOT_VERIFIED":
      return {
        status,
        code: "EMAIL_NOT_VERIFIED",
        message: "Your email address has not been verified yet.",
      };
    case "INVALID_INPUT":
      return {
        status,
        code: "INVALID_INPUT",
        message: "Enter both email and password.",
      };
    default:
      if (status === 429) {
        return {
          status,
          code: "TOO_MANY_ATTEMPTS",
          message: "Too many sign-in attempts. Please wait a moment and try again.",
        };
      }

      return toProxyError(status, body, "Sign-in failed. Please try again.");
  }
}

export async function POST(req: NextRequest) {
  const json = (await req.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = typeof json?.email === "string" ? json.email.trim() : "";
  const password = typeof json?.password === "string" ? json.password : "";

  if (!email || !password) {
    const err = toProxyError(
      400,
      {
        code: "INVALID_INPUT",
        message: "Email and password are required.",
      },
      "Email and password are required.",
    );

    return NextResponse.json(err, { status: 400 });
  }

  const testRateLimitKey = req.headers.get("x-test-ratelimit-key");

  const upstreamHeaders: Record<string, string> = {
    "content-type": "application/json",
  };

  if (testRateLimitKey) {
    upstreamHeaders["X-Test-RateLimit-Key"] = testRateLimitKey;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch (e) {
    const err = toProxyError(
      503,
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
      "Auth service unavailable",
    );

    return NextResponse.json(err, { status: 503 });
  }

  const text = await upstream.text().catch(() => "");
  const body = safeJsonParse(text);

  if (!upstream.ok) {
    const err = authErrorPayload(upstream.status, body);
    return NextResponse.json(err, { status: upstream.status });
  }

  let tokens: TokenResponse;
  try {
    tokens = normalizeTokens(body);
  } catch (e) {
    const err = toProxyError(
      502,
      {
        code: "INVALID_UPSTREAM_RESPONSE",
        message: e instanceof Error ? e.message : "Invalid login response",
      },
      "Login response did not include expected tokens.",
    );

    return NextResponse.json(err, { status: 502 });
  }

  await setAuthCookies(tokens);

  return NextResponse.json({ ok: true }, { status: 200 });
}
