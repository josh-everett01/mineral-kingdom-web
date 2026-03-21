import { NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"

type RouteContext = {
  params: Promise<{
    paymentId: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { paymentId } = await context.params

  let upstream: Response

  try {
    upstream = await fetch(`${API_BASE_URL}/api/checkout-payments/${paymentId}/events`, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
      },
      cache: "no-store",
    })
  } catch (e) {
    return NextResponse.json(
      {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
      { status: 503 },
    )
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "")
    return new NextResponse(text || "Unable to open checkout payment event stream.", {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    })
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-store, must-revalidate",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  })
}