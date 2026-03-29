import { NextRequest, NextResponse } from "next/server"
import { apiRefresh } from "@/lib/auth/api"
import {
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
} from "@/lib/auth/cookies"
import { toProxyError } from "@/lib/api/proxyError"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"

type RouteContext = {
  params: Promise<{
    orderId: string
  }>
}

type SetAuctionShippingChoiceRequest = {
  shippingMode?: string | null
}

function contentType(res: Response) {
  return (res.headers.get("content-type") ?? "").toLowerCase()
}

async function readBody(res: Response): Promise<unknown> {
  const ct = contentType(res)

  if (ct.includes("application/json")) {
    try {
      return await res.json()
    } catch {
      return null
    }
  }

  try {
    return await res.text()
  } catch {
    return null
  }
}

async function forwardOnce(
  orderId: string,
  accessToken: string,
  body: SetAuctionShippingChoiceRequest,
) {
  const headers = new Headers()
  headers.set("accept", "application/json")
  headers.set("content-type", "application/json")
  headers.set("authorization", `Bearer ${accessToken}`)

  return fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}/auction-shipping-choice`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  })
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { orderId } = await context.params
  const body = (await req.json().catch(() => null)) as SetAuctionShippingChoiceRequest | null

  if (!body?.shippingMode) {
    return NextResponse.json(
      {
        status: 400,
        code: "INVALID_REQUEST",
        message: "shippingMode is required.",
      },
      { status: 400 },
    )
  }

  const initialAccess = await getAccessToken()
  const refresh = await getRefreshToken()
  const startedAuthenticated = Boolean(initialAccess || refresh)

  if (!initialAccess && !refresh) {
    return NextResponse.json(
      {
        status: 401,
        code: "AUTH_EXPIRED",
        message: "Your session expired. Please sign in again.",
      },
      { status: 401 },
    )
  }

  let access = initialAccess
  let upstream: Response

  try {
    if (!access && refresh) {
      const tokens = await apiRefresh(refresh)
      await setAuthCookies(tokens)
      access = tokens.access_token
    }

    if (!access) {
      return NextResponse.json(
        {
          status: 401,
          code: "AUTH_EXPIRED",
          message: "Your session expired. Please sign in again.",
        },
        { status: 401 },
      )
    }

    upstream = await forwardOnce(orderId, access, body)
  } catch (e) {
    const err = toProxyError(
      503,
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
      "Auction shipping choice service unavailable",
    )

    return NextResponse.json(err, { status: 503 })
  }

  if (upstream.status === 401 && refresh) {
    try {
      const tokens = await apiRefresh(refresh)
      await setAuthCookies(tokens)
      access = tokens.access_token
      upstream = await forwardOnce(orderId, access, body)
    } catch {
      await clearAuthCookies()

      if (startedAuthenticated) {
        return NextResponse.json(
          {
            status: 401,
            code: "AUTH_EXPIRED",
            message: "Your session expired. Please sign in again.",
          },
          { status: 401 },
        )
      }
    }
  }

  if (!upstream.ok) {
    const upstreamBody = await readBody(upstream)
    const err = toProxyError(
      upstream.status,
      upstreamBody,
      `Upstream request failed (${upstream.status})`,
    )

    return NextResponse.json(err, { status: upstream.status })
  }

  const ct = contentType(upstream)

  if (ct.includes("application/json")) {
    const json = await upstream.json()
    return NextResponse.json(json, {
      status: upstream.status,
      headers: {
        "cache-control": "no-store",
      },
    })
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  })
}