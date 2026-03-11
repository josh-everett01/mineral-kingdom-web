import { NextRequest, NextResponse } from "next/server"
import { toProxyError } from "@/lib/api/proxyError"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"

const ALLOWED_QUERY_KEYS = [
  "page",
  "pageSize",
  "sort",
  "listingType",
  "mineralType",
  "sizeClass",
  "minPrice",
  "maxPrice",
  "fluorescent",
] as const

function safeJsonParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

export async function GET(req: NextRequest) {
  const incoming = req.nextUrl.searchParams
  const upstreamQuery = new URLSearchParams()

  for (const key of ALLOWED_QUERY_KEYS) {
    const value = incoming.get(key)
    if (value && value.trim().length > 0) {
      upstreamQuery.set(key, value)
    }
  }

  const query = upstreamQuery.toString()
  const url = `${API_BASE_URL}/api/listings${query ? `?${query}` : ""}`

  let upstream: Response
  try {
    upstream = await fetch(url, {
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
      "Listings service unavailable",
    )

    return NextResponse.json(err, { status: 503 })
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