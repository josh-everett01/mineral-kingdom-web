import { NextRequest, NextResponse } from "next/server"
import { apiRefresh } from "@/lib/auth/api"
import {
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from "@/lib/auth/cookies"
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

async function readBodyForError(res: Response): Promise<unknown> {
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
  upstreamUrl: string,
  accessToken: string | null,
  bodyText: string,
) {
  const headers = new Headers()
  headers.set("content-type", "application/json")
  headers.set("accept", "application/json")

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`)
  }

  return fetch(upstreamUrl, {
    method: "POST",
    headers,
    body: bodyText,
    cache: "no-store",
  })
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { auctionId } = await context.params
  const upstreamUrl = `${API_BASE_URL}/api/auctions/${encodeURIComponent(auctionId)}/bids`

  let bodyText = ""

  try {
    bodyText = await req.text()
  } catch {
    return NextResponse.json(
      {
        status: 400,
        code: "INVALID_BODY",
        message: "Request body could not be read.",
      },
      { status: 400 },
    )
  }

  let access = await getAccessToken()
  let res: Response

  try {
    res = await forwardOnce(upstreamUrl, access, bodyText)
  } catch (e) {
    const err = toProxyError(
      503,
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
      "Auction bidding service unavailable",
    )

    return NextResponse.json(err, { status: 503 })
  }

  if (res.status === 401) {
    const refresh = await getRefreshToken()

    if (refresh) {
      try {
        const tokens = await apiRefresh(refresh)
        await setAuthCookies(tokens)
        access = tokens.access_token
        res = await forwardOnce(upstreamUrl, access, bodyText)
      } catch {
        await clearAuthCookies()
      }
    }
  }

  if (!res.ok) {
    const body = await readBodyForError(res)
    const err = toProxyError(
      res.status,
      body,
      `Upstream request failed (${res.status})`,
    )

    return NextResponse.json(err, { status: res.status })
  }

  const ct = contentType(res)

  if (ct.includes("application/json")) {
    const json = await res.json()
    return NextResponse.json(json, {
      status: res.status,
      headers: {
        "cache-control": "no-store",
      },
    })
  }

  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  })
}