import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"
const CART_COOKIE_NAME = "mk_cart_id"

async function buildHeaders(): Promise<Headers> {
  const cookieStore = await cookies()
  const headers = new Headers({
    Accept: "text/event-stream",
  })

  const cartId = cookieStore.get(CART_COOKIE_NAME)?.value
  if (cartId) {
    headers.set("X-Cart-Id", cartId)
  }

  return headers
}

type RouteContext = {
  params: Promise<{
    cartId: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { cartId } = await context.params

  let upstream: Response
  try {
    upstream = await fetch(`${API_BASE_URL}/api/carts/${cartId}/events`, {
      method: "GET",
      headers: await buildHeaders(),
      cache: "no-store",
    })
  } catch (e) {
    return NextResponse.json(
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
      { status: 503 },
    )
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "")
    return new NextResponse(text || "Unable to open cart event stream.", {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    })
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-store, must-revalidate",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  })
}