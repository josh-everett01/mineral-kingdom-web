import { NextResponse } from "next/server"
import { getAccessToken } from "@/lib/auth/cookies"
import { toProxyError } from "@/lib/api/proxyError"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"

type PaymentConfirmationResponse = {
  paymentId: string
  provider: string
  paymentStatus: string
  isConfirmed: boolean
  orderId?: string | null
  orderNumber?: string | null
  orderStatus?: string | null
  orderTotalCents?: number | null
  orderCurrencyCode?: string | null
  guestEmail?: string | null
}

function safeJsonParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params
  const { searchParams } = new URL(req.url)
  const paymentId = searchParams.get("paymentId")
  const access = await getAccessToken()

  if (access) {
    let upstream: Response

    try {
      upstream = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}`, {
        headers: {
          authorization: `Bearer ${access}`,
        },
        cache: "no-store",
      })
    } catch (e) {
      const err = toProxyError(
        503,
        {
          code: "UPSTREAM_UNAVAILABLE",
          message: e instanceof Error ? e.message : "Upstream fetch failed",
        },
        "Order service unavailable",
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

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    })
  }

  if (!paymentId) {
    return NextResponse.json(
      {
        status: 401,
        code: "UNAUTHORIZED",
        message: "Authentication or paymentId is required.",
      },
      { status: 401 },
    )
  }

  let confirmationRes: Response

  try {
    confirmationRes = await fetch(
      `${API_BASE_URL}/api/payments/${encodeURIComponent(paymentId)}/confirmation`,
      {
        cache: "no-store",
      },
    )
  } catch (e) {
    const err = toProxyError(
      503,
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
      "Payment confirmation service unavailable",
    )

    return NextResponse.json(err, { status: 503 })
  }

  const confirmationText = await confirmationRes.text().catch(() => "")
  const confirmationBody = safeJsonParse(confirmationText)

  if (!confirmationRes.ok) {
    const err = toProxyError(
      confirmationRes.status,
      confirmationBody,
      `Upstream request failed (${confirmationRes.status})`,
    )

    return NextResponse.json(err, { status: confirmationRes.status })
  }

  const confirmation = confirmationBody as PaymentConfirmationResponse

  if (confirmation.orderId !== orderId) {
    return NextResponse.json(
      {
        status: 404,
        code: "ORDER_NOT_FOUND",
        message: "Order not found for this payment confirmation.",
      },
      { status: 404 },
    )
  }

  return NextResponse.json(
    {
      id: confirmation.orderId,
      orderNumber: confirmation.orderNumber,
      status: confirmation.orderStatus,
      totalCents: confirmation.orderTotalCents,
      currencyCode: confirmation.orderCurrencyCode,
      paymentStatus: confirmation.paymentStatus,
      provider: confirmation.provider,
      guestEmail: confirmation.guestEmail,
      isConfirmed: confirmation.isConfirmed,
    },
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
      },
    },
  )
}
