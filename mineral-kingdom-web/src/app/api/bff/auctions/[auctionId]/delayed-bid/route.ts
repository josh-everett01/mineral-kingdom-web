import { NextRequest, NextResponse } from "next/server"
import { getAccessToken, getRefreshToken, setAuthCookies, clearAuthCookies } from "@/lib/auth/cookies"
import { apiRefresh } from "@/lib/auth/api"
import { toProxyError } from "@/lib/api/proxyError"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"

type RouteContext = {
  params: Promise<{
    auctionId: string
  }>
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

async function forwardOnce(auctionId: string, accessToken: string | null) {
  const headers = new Headers()
  headers.set("accept", "application/json")

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`)
  }

  return fetch(`${API_BASE_URL}/api/auctions/${encodeURIComponent(auctionId)}/delayed-bid`, {
    method: "DELETE",
    headers,
    cache: "no-store",
  })
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { auctionId } = await context.params

  let access = await getAccessToken()
  let upstream: Response

  try {
    upstream = await forwardOnce(auctionId, access)
  } catch (e) {
    const err = toProxyError(
      503,
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
      "Auction delayed bid service unavailable",
    )

    return NextResponse.json(err, { status: 503 })
  }

  if (upstream.status === 401) {
    const refresh = await getRefreshToken()

    if (refresh) {
      try {
        const tokens = await apiRefresh(refresh)
        await setAuthCookies(tokens)
        access = tokens.access_token
        upstream = await forwardOnce(auctionId, access)
      } catch {
        await clearAuthCookies()
      }
    }
  }

  if (upstream.status === 401) {
    return NextResponse.json(
      {
        status: 401,
        code: "AUTH_EXPIRED",
        message: "Your session expired. Please sign in again.",
      },
      { status: 401 },
    )
  }

  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  if (!upstream.ok) {
    const body = await readBody(upstream)
    const err = toProxyError(
      upstream.status,
      body,
      `Upstream request failed (${upstream.status})`,
    )

    return NextResponse.json(err, { status: upstream.status })
  }

  const body = await readBody(upstream)
  return NextResponse.json(body, {
    status: upstream.status,
    headers: {
      "cache-control": "no-store",
    },
  })
}