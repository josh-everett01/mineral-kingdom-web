import { NextRequest } from "next/server";
import { toProxyError } from "@/lib/api/proxyError";
import type {
  ResendVerificationRequest,
  ResendVerificationResponse,
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
  const json = (await req.json().catch(() => null)) as ResendVerificationRequest | null;
  const email = typeof json?.email === "string" ? json.email.trim() : "";

  if (!email) {
    const err = toProxyError(
      400,
      {
        code: "INVALID_INPUT",
        message: "Email is required.",
      },
      "Email is required."
    );

    return Response.json(err, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream fetch failed";
    const err = toProxyError(
      503,
      {
        code: "UPSTREAM_UNAVAILABLE",
        message,
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

  const response: ResendVerificationResponse = { ok: true };
  return Response.json(response, { status: 200 });
}