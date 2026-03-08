import { NextRequest } from "next/server";
import { toProxyError } from "@/lib/api/proxyError";
import type { VerifyEmailRequest, VerifyEmailResponse } from "@/lib/auth/contracts";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

function safeJsonParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function mapVerifyError(status: number, body: unknown) {
  if (typeof body === "object" && body !== null) {
    const rec = body as Record<string, unknown>;
    const err = typeof rec.error === "string" ? rec.error : undefined;

    if (err === "INVALID_OR_EXPIRED_TOKEN") {
      return toProxyError(
        status,
        {
          code: err,
          message: "This verification link is invalid or expired.",
        },
        "This verification link is invalid or expired."
      );
    }

    if (err === "INVALID_INPUT") {
      return toProxyError(
        status,
        {
          code: err,
          message: "Verification token is required.",
        },
        "Verification token is required."
      );
    }
  }

  return toProxyError(status, body, `Upstream request failed (${status})`);
}

export async function POST(req: NextRequest) {
  const json = (await req.json().catch(() => null)) as VerifyEmailRequest | null;
  const token = typeof json?.token === "string" ? json.token.trim() : "";

  if (!token) {
    const err = toProxyError(
      400,
      {
        code: "INVALID_INPUT",
        message: "Verification token is required.",
      },
      "Verification token is required."
    );

    return Response.json(err, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream fetch failed";
    const err = toProxyError(
      503,
      {
        code: "UPSTREAM_UNAVAILABLE",
        message,
        details: e,
      },
      "Auth service unavailable"
    );

    return Response.json(err, { status: 503 });
  }

  const text = await upstream.text().catch(() => "");
  const body = safeJsonParse(text);

  if (!upstream.ok) {
    const err = mapVerifyError(upstream.status, body);
    return Response.json(err, { status: upstream.status });
  }

  const response: VerifyEmailResponse = { ok: true };
  return Response.json(response, { status: 200 });
}