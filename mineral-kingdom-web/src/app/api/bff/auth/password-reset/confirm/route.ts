import { NextRequest } from "next/server";
import { toProxyError } from "@/lib/api/proxyError";
import type {
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
} from "@/lib/auth/contracts";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

function safeJsonParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export async function POST(req: NextRequest) {
  const json = (await req.json().catch(() => null)) as
    | (PasswordResetConfirmRequest & { new_password?: string })
    | null;

  const token = typeof json?.token === "string" ? json.token.trim() : "";

  const newPassword =
    typeof json?.newPassword === "string"
      ? json.newPassword.trim()
      : typeof json?.new_password === "string"
        ? json.new_password.trim()
        : "";

  if (!token) {
    const err = toProxyError(
      400,
      { code: "INVALID_INPUT", message: "Password reset token is required." },
      "Password reset token is required."
    );

    return Response.json(err, { status: 400 });
  }

  if (!newPassword) {
    const err = toProxyError(
      400,
      { code: "INVALID_INPUT", message: "New password is required." },
      "New password is required."
    );

    return Response.json(err, { status: 400 });
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
    upstream = await fetch(`${API_BASE_URL}/api/auth/password-reset/confirm`, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify({
        token,
        newPassword,
        new_password: newPassword,
      }),
      cache: "no-store",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream fetch failed";
    const err = toProxyError(
      503,
      { code: "UPSTREAM_UNAVAILABLE", message },
      "Auth service unavailable"
    );

    return Response.json(err, { status: 503 });
  }

  const text = await upstream.text().catch(() => "");
  const body = safeJsonParse(text);

  if (!upstream.ok) {
    const err = toProxyError(upstream.status, body, `Upstream request failed (${upstream.status})`);
    return Response.json(err, { status: upstream.status });
  }

  const response: PasswordResetConfirmResponse = { ok: true };
  return Response.json(response, { status: 200 });
}