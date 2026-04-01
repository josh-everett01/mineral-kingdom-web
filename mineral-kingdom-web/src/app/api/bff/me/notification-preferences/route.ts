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

async function forwardGet(accessToken: string | null) {
  const headers = new Headers()
  headers.set("accept", "application/json")

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`)
  }

  return fetch(`${API_BASE_URL}/api/me/notification-preferences`, {
    method: "GET",
    headers,
    cache: "no-store",
  })
}

async function forwardPut(accessToken: string | null, bodyText: string) {
  const headers = new Headers()
  headers.set("accept", "application/json")
  headers.set("content-type", "application/json")

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`)
  }

  return fetch(`${API_BASE_URL}/api/me/notification-preferences`, {
    method: "PUT",
    headers,
    body: bodyText,
    cache: "no-store",
  })
}

async function handleAuthenticatedRequest(
  perform: (accessToken: string | null) => Promise<Response>,
  unavailableMessage: string,
) {
  const initialAccess = await getAccessToken()
  const refresh = await getRefreshToken()
  const startedAuthenticated = Boolean(initialAccess || refresh)

  let access = initialAccess
  let upstream: Response

  try {
    upstream = await perform(access)
  } catch (e) {
    const err = toProxyError(
      503,
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
      unavailableMessage,
    )

    return NextResponse.json(err, { status: 503 })
  }

  if (upstream.status === 401) {
    if (refresh) {
      try {
        const tokens = await apiRefresh(refresh)
        await setAuthCookies(tokens)
        access = tokens.access_token
        upstream = await perform(access)
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
    } else if (startedAuthenticated) {
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

  if (!upstream.ok) {
    const body = await readBody(upstream)
    const err = toProxyError(
      upstream.status,
      body,
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

export async function GET() {
  return handleAuthenticatedRequest(
    (accessToken) => forwardGet(accessToken),
    "Notification preferences service unavailable",
  )
}

export async function PUT(request: NextRequest) {
  const bodyText = await request.text().catch(() => "")

  return handleAuthenticatedRequest(
    (accessToken) => forwardPut(accessToken, bodyText),
    "Notification preferences service unavailable",
  )
}