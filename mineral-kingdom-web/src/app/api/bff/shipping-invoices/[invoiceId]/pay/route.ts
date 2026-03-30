import { NextRequest, NextResponse } from "next/server"
import { apiRefresh } from "@/lib/auth/api"
import {
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

async function fetchInvoiceOnce(accessToken: string) {
  const headers = new Headers()
  headers.set("accept", "application/json")
  headers.set("authorization", `Bearer ${accessToken}`)

  return fetch(`${API_BASE_URL}/api/me/open-box/shipping-invoice`, {
    method: "GET",
    headers,
    cache: "no-store",
  })
}

async function startPaymentOnce(
  accessToken: string,
  body: StartShippingInvoicePaymentRequest,
) {
  const headers = new Headers()
  headers.set("accept", "application/json")
  headers.set("content-type", "application/json")
  headers.set("authorization", `Bearer ${accessToken}`)

  return fetch(`${API_BASE_URL}/api/me/open-box/shipping-invoice/pay`, {
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

    let invoiceRes = await fetchInvoiceOnce(access)

    if (invoiceRes.status === 401 && refresh) {
      const tokens = await apiRefresh(refresh)
      await setAuthCookies(tokens)
      access = tokens.access_token
      invoiceRes = await fetchInvoiceOnce(access)
    }

    if (invoiceRes.status === 404) {
      return NextResponse.json(
        {
          status: 404,
          code: "SHIPPING_INVOICE_NOT_FOUND",
          message: "We couldn’t find this shipping invoice.",
        },
        { status: 404 },
      )
    }

    if (!invoiceRes.ok) {
      const invoiceBody = await readBody(invoiceRes)
      const err = toProxyError(
        invoiceRes.status,
        invoiceBody,
        `Upstream request failed (${invoiceRes.status})`,
      )

      return NextResponse.json(err, { status: invoiceRes.status })
    }

    const invoice = (await invoiceRes.json()) as ShippingInvoiceDetailDto | null

    if (!invoice?.shippingInvoiceId || invoice.shippingInvoiceId !== invoiceId) {
      return NextResponse.json(
        {
          status: 404,
          code: "SHIPPING_INVOICE_NOT_FOUND",
          message: "We couldn’t find this shipping invoice.",
        },
        { status: 404 },
      )
    }

    let paymentRes = await startPaymentOnce(access, body)

    if (paymentRes.status === 401 && refresh) {
      const tokens = await apiRefresh(refresh)
      await setAuthCookies(tokens)
      access = tokens.access_token
      paymentRes = await startPaymentOnce(access, body)
    }

    if (!paymentRes.ok) {
      const paymentBody = await readBody(paymentRes)
      const err = toProxyError(
        paymentRes.status,
        paymentBody,
        `Upstream request failed (${paymentRes.status})`,
      )

      return NextResponse.json(err, { status: paymentRes.status })
    }

    const ct = contentType(paymentRes)

    if (ct.includes("application/json")) {
      const json = await paymentRes.json()
      return NextResponse.json(json, {
        status: paymentRes.status,
        headers: {
          "cache-control": "no-store",
        },
      })
    }

    return new NextResponse(paymentRes.body, {
      status: paymentRes.status,
      headers: {
        "content-type": paymentRes.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    })
  } catch (e) {
    if (startedAuthenticated && e instanceof Error && e.message) {
      // fall through to generic unavailable response below
    }

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
}