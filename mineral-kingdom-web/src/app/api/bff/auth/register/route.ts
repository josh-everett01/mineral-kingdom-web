import { NextRequest } from "next/server";
import { toProxyError } from "@/lib/api/proxyError";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

function safeJsonParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function mapRegisterError(status: number, body: unknown) {
  // backend seems to return: { error: "EMAIL_ALREADY_IN_USE" }
  if (typeof body === "object" && body !== null) {
    const rec = body as Record<string, unknown>;
    const err = typeof rec.error === "string" ? rec.error : undefined;

    if (err === "EMAIL_ALREADY_IN_USE") {
      return toProxyError(
        status,
        { code: err, message: "Email already in use. Try signing in.", details: body },
        "Email already in use."
      );
    }
  }

  return toProxyError(status, body, `Upstream request failed (${status})`);
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(json),
      cache: "no-store",
    });
  } catch (e) {
    // IMPORTANT: don’t crash the Next.js server in CI if API isn’t running
    const message =
      e instanceof Error ? e.message : "Upstream fetch failed";
    const err = toProxyError(
      503,
      { code: "UPSTREAM_UNAVAILABLE", message, details: e },
      "Auth service unavailable"
    );
    return Response.json(err, { status: 503 });
  }

  const text = await upstream.text().catch(() => "");
  const body = safeJsonParse(text);

  if (!upstream.ok) {
    const err = mapRegisterError(upstream.status, body);
    return Response.json(err, { status: upstream.status });
  }

  return new Response(text, {
    status: 200,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}