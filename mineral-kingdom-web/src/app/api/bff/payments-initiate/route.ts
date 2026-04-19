import { NextResponse } from "next/server"
import { getAccessToken } from "@/lib/auth/cookies"
import { toProxyError } from "@/lib/api/proxyError"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"

type InitiatePaymentRequest = {
  holdId?: string
  provider?: string
  shippingMode?: string
}

function safeJsonParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

export async function POST(req: Request) {
  const origin = new URL(req.url).origin
  const body = (await req.json().catch(() => null)) as InitiatePaymentRequest | null
  const accessToken = await getAccessToken()

  if (!body?.holdId || !body?.provider) {
    return NextResponse.json(
      {
        status: 400,
        code: "INVALID_REQUEST",
        message: "holdId and provider are required.",
      },
      { status: 400 },
    )
  }

  let upstream: Response

  try {
    const headers = new Headers({
      "content-type": "application/json",
    })

    if (accessToken) {
      headers.set("authorization", `Bearer ${accessToken}`)
    }

    upstream = await fetch(`${API_BASE_URL}/api/payments/start`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        holdId: body.holdId,
        provider: body.provider,
        shippingMode: body.shippingMode ?? null,
        successUrl: `${origin}/checkout/return`,
        cancelUrl: `${origin}/checkout/return?cancelled=1`,
      }),
      cache: "no-store",
    })
  } catch (e) {
    const err = toProxyError(
      503,
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
      "Payment service unavailable",
    )

    return NextResponse.json(err, { status: 503 })
  }

  const text = await upstream.text().catch(() => "")
  const parsed = safeJsonParse(text)

  if (!upstream.ok) {
    const err = toProxyError(
      upstream.status,
      parsed,
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