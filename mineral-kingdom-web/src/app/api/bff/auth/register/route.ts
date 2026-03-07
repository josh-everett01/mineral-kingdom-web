import { NextRequest } from "next/server";
import { toProxyError, type ProxyError } from "@/lib/api/proxyError";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

function safeJsonParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function mapRegisterError(status: number, body: unknown): ProxyError {
  // backend returns: { error: "EMAIL_ALREADY_IN_USE" }
  if (typeof body === "object" && body !== null) {
    const rec = body as Record<string, unknown>;
    const err = typeof rec.error === "string" ? rec.error : undefined;

    if (err === "EMAIL_ALREADY_IN_USE") {
      // return a clean ProxyError with a friendly message + stable code
      return { status, code: err, message: "Email already in use. Try signing in.", details: body };
    }
  }

  return toProxyError(status, body, `Upstream request failed (${status})`);
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);

  const upstream = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(json),
    cache: "no-store",
  });

  const text = await upstream.text().catch(() => "");
  const body = safeJsonParse(text);

  if (!upstream.ok) {
    const err = mapRegisterError(upstream.status, body);
    return Response.json(err, { status: upstream.status });
  }

  return new Response(text, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}