import { NextResponse } from "next/server"
import { toProxyError } from "@/lib/api/proxyError"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"

function safeJsonParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  let upstream: Response
  try {
    upstream = await fetch(`${API_BASE_URL}/api/listings/${encodeURIComponent(id)}`, {
      method: "GET",
      cache: "no-store",
    })
  } catch (e) {
    const err = toProxyError(
      503,
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
      "Listing detail service unavailable",
    )

    return NextResponse.json(err, { status: 503 })
  }

  if (upstream.status === 404) {
    return NextResponse.json(
      {
        status: 404,
        code: "LISTING_NOT_FOUND",
        message: "Listing not found.",
      },
      { status: 404 },
    )
  }

  const text = await upstream.text().catch(() => "")
  const body = safeJsonParse(text)

  if (!upstream.ok) {
    const err = toProxyError(
      upstream.status,
      body,
      `Upstream request failed (${upstream.status})`,
    )

    return NextResponse.json(err, { status: upstream.status })
  }

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  })
}