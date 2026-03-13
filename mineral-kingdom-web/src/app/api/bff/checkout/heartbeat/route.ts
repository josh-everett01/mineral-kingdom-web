import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { toProxyError } from "@/lib/api/proxyError"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"
const CART_COOKIE_NAME = "mk_cart_id"

function safeJsonParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

async function buildHeaders(): Promise<Headers> {
  const cookieStore = await cookies()
  const headers = new Headers({
    "content-type": "application/json",
  })

  const cartId = cookieStore.get(CART_COOKIE_NAME)?.value
  if (cartId) {
    headers.set("X-Cart-Id", cartId)
  }

  return headers
}

async function persistCartIdFromUpstream(upstream: Response, response: NextResponse) {
  const cartId = upstream.headers.get("X-Cart-Id")
  if (!cartId) return

  response.cookies.set(CART_COOKIE_NAME, cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
}

export async function POST(req: Request) {
  let upstream: Response

  try {
    upstream = await fetch(`${API_BASE_URL}/api/checkout/heartbeat`, {
      method: "POST",
      headers: await buildHeaders(),
      body: await req.text(),
      cache: "no-store",
    })
  } catch (e) {
    const err = toProxyError(
      503,
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
      "Checkout service unavailable",
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

  const response = new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  })

  await persistCartIdFromUpstream(upstream, response)
  return response
}