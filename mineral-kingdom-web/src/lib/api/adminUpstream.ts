import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { toProxyError } from "@/lib/api/proxyError"
import { apiRefresh } from "@/lib/auth/api"
import {
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
} from "@/lib/auth/cookies"
import { sessionFromAccessToken } from "@/lib/auth/session"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"
const isTesting =
  process.env.APP_ENV === "testing" ||
  process.env.NEXT_PUBLIC_APP_ENV === "testing" ||
  process.env.E2E_BACKEND === "1" ||
  process.env.NODE_ENV === "test"

function safeJsonParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

async function buildHeaders(
  accessToken: string | null,
  contentType?: string,
): Promise<Headers> {
  await cookies()

  const headers = new Headers({
    Accept: "application/json",
  })

  if (contentType) {
    headers.set("content-type", contentType)
  }

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`)

    if (isTesting) {
      const session = sessionFromAccessToken(accessToken)
      const userId =
        typeof session?.user === "object" &&
          session.user !== null &&
          "id" in session.user &&
          typeof session.user.id === "string"
          ? session.user.id
          : null

      const primaryRole =
        Array.isArray(session?.roles) &&
          session.roles.length > 0 &&
          typeof session.roles[0] === "string"
          ? session.roles[0]
          : null

      if (userId) {
        headers.set("X-Test-UserId", userId)
      }

      headers.set("X-Test-EmailVerified", "true")

      if (primaryRole) {
        headers.set("X-Test-Role", primaryRole)
      }
    }
  }

  return headers
}

async function fetchUpstream(args: {
  upstreamPath: string
  method: string
  body?: unknown
  accessToken: string | null
}) {
  const hasBody = args.body !== undefined

  return fetch(`${API_BASE_URL}${args.upstreamPath}`, {
    method: args.method,
    headers: await buildHeaders(args.accessToken, hasBody ? "application/json" : undefined),
    body: hasBody ? JSON.stringify(args.body) : undefined,
    cache: "no-store",
  })
}

async function maybeRefreshAccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken()

  if (!refresh) {
    await clearAuthCookies()
    return null
  }

  try {
    const tokens = await apiRefresh(refresh)
    await setAuthCookies(tokens)
    return tokens.access_token
  } catch {
    await clearAuthCookies()
    return null
  }
}

export async function forwardAdminJson(
  req: NextRequest,
  upstreamPath: string,
  options?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE"
    body?: unknown
  },
) {
  const method = options?.method ?? req.method

  let upstream: Response

  try {
    const accessToken = await getAccessToken()

    upstream = await fetchUpstream({
      upstreamPath,
      method,
      body: options?.body,
      accessToken,
    })

    if (upstream.status === 401) {
      const refreshedAccessToken = await maybeRefreshAccessToken()

      if (refreshedAccessToken) {
        upstream = await fetchUpstream({
          upstreamPath,
          method,
          body: options?.body,
          accessToken: refreshedAccessToken,
        })
      }
    }
  } catch (e) {
    const err = toProxyError(
      503,
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
      "Admin service unavailable",
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

  if (upstream.status === 204) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "cache-control": "no-store",
      },
    })
  }

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  })
}