import { cookies } from "next/headers"
import { apiRefresh } from "@/lib/auth/api"
import {
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
} from "@/lib/auth/cookies"
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

async function buildHeaders(accessToken?: string | null) {
  const cookieStore = await cookies()

  const headers = new Headers({
    "content-type": "application/json",
    accept: "application/json",
  })

  const cartId = cookieStore.get(CART_COOKIE_NAME)?.value
  if (cartId) {
    headers.set("X-Cart-Id", cartId)
  }

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`)
  }

  return headers
}

async function forwardOnce(bodyText: string, accessToken?: string | null) {
  return fetch(`${API_BASE_URL}/api/checkout/preview-pricing`, {
    method: "POST",
    headers: await buildHeaders(accessToken),
    body: bodyText,
    cache: "no-store",
  })
}

export async function POST(req: Request) {
  const bodyText = await req.text()

  let access = await getAccessToken()
  const refresh = await getRefreshToken()

  let upstream: Response

  try {
    upstream = await forwardOnce(bodyText, access)
  } catch (e) {
    const err = toProxyError(
      503,
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
      "Checkout preview service unavailable",
    )

    return NextResponse.json(err, { status: 503 })
  }

  if (upstream.status === 401 && refresh) {
    try {
      const tokens = await apiRefresh(refresh)
      await setAuthCookies(tokens)
      access = tokens.access_token
      upstream = await forwardOnce(bodyText, access)
    } catch {
      await clearAuthCookies()
    }
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