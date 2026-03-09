import { NextRequest } from "next/server";
import { toProxyError } from "@/lib/api/proxyError";
import type { RegisterRequest, RegisterResponse } from "@/lib/auth/contracts";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

function safeJsonParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export async function POST(req: NextRequest) {
  const json = (await req.json().catch(() => null)) as RegisterRequest | null;
  const email = typeof json?.email === "string" ? json.email.trim() : "";
  const password = typeof json?.password === "string" ? json.password : "";

  if (!email || !password) {
    const err = toProxyError(
      400,
      {
        code: "INVALID_INPUT",
        message: "Email and password are required.",
      },
      "Email and password are required."
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
    upstream = await fetch(`${API_BASE_URL}/api/auth/register`, {
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

  const upstreamData =
    body && typeof body === "object" ? (body as Partial<RegisterResponse>) : null;

  const response: RegisterResponse = {
    ...(upstreamData ?? {}),
  } as RegisterResponse;

  return Response.json(response, { status: 200 });
}