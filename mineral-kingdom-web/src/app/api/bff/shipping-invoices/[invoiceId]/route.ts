import { NextResponse } from "next/server"
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

type ShippingInvoiceDetailDto = {
  shippingInvoiceId?: string
  fulfillmentGroupId?: string | null
  amountCents?: number
  currencyCode?: string | null
  status?: string | null
  paidAt?: string | null
  provider?: string | null
  providerCheckoutId?: string | null
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

async function forwardOnce(accessToken: string) {
  const headers = new Headers()
  headers.set("accept", "application/json")
  headers.set("authorization", `Bearer ${accessToken}`)

  return fetch(`${API_BASE_URL}/api/me/open-box/shipping-invoice`, {
    method: "GET",
    headers,
    cache: "no-store",
  })
}

export async function GET(_req: Request, context: RouteContext) {
  const { invoiceId } = await context.params

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

    upstream = await forwardOnce(access)
  } catch (e) {
    const err = toProxyError(
      503,
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
      "Shipping invoice service unavailable",
    )

    return NextResponse.json(err, { status: 503 })
  }

  if (upstream.status === 401 && refresh) {
    try {
      const tokens = await apiRefresh(refresh)
      await setAuthCookies(tokens)
      access = tokens.access_token
      upstream = await forwardOnce(access)
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

  const body = (await upstream.json()) as ShippingInvoiceDetailDto | null

  if (!body?.shippingInvoiceId) {
    return NextResponse.json(
      {
        status: 404,
        code: "SHIPPING_INVOICE_NOT_FOUND",
        message: "We couldn’t find this shipping invoice.",
      },
      { status: 404 },
    )
  }

  if (body.shippingInvoiceId !== invoiceId) {
    return NextResponse.json(
      {
        status: 404,
        code: "SHIPPING_INVOICE_NOT_FOUND",
        message: "We couldn’t find this shipping invoice.",
      },
      { status: 404 },
    )
  }

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "cache-control": "no-store",
    },
  })
}