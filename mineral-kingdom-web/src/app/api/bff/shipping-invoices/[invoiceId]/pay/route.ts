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
    invoiceId: string
  }>
}

type StartShippingInvoicePaymentRequest = {
  provider?: string | null
  successUrl?: string | null
  cancelUrl?: string | null
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

async function startPaymentOnce(
  accessToken: string,
  invoiceId: string,
  body: StartShippingInvoicePaymentRequest,
) {
  const headers = new Headers()
  headers.set("accept", "application/json")
  headers.set("content-type", "application/json")
  headers.set("authorization", `Bearer ${accessToken}`)

  return fetch(`${API_BASE_URL}/api/shipping-invoices/${invoiceId}/pay`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  })
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { invoiceId } = await context.params
  const body = (await req.json().catch(() => null)) as StartShippingInvoicePaymentRequest | null

  if (!body?.provider || !body.successUrl || !body.cancelUrl) {
    return NextResponse.json(
      {
        status: 400,
        code: "INVALID_REQUEST",
        message: "provider, successUrl, and cancelUrl are required.",
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

    upstream = await startPaymentOnce(access, invoiceId, body)
  } catch (e) {
    const err = toProxyError(
      503,
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
      "Shipping invoice payment service unavailable",
    )

    return NextResponse.json(err, { status: 503 })
  }

  if (upstream.status === 401 && refresh) {
    try {
      const tokens = await apiRefresh(refresh)
      await setAuthCookies(tokens)
      access = tokens.access_token
      upstream = await startPaymentOnce(access, invoiceId, body)
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

  if (upstream.status === 404) {
    return NextResponse.json(
      {
        status: 404,
        code: "SHIPPING_INVOICE_NOT_FOUND",
        message: "We couldn’t find this shipping invoice.",
      },
      { status: 404 },
    )
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