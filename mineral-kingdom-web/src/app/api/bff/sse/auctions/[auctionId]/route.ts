import type { NextRequest } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  } as const
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ auctionId: string }> },
) {
  const { auctionId } = await ctx.params

  const upstreamUrl = `${API_BASE_URL}/api/auctions/${auctionId}/events`

  const upstreamRes = await fetch(upstreamUrl, {
    method: "GET",
    headers: {
      accept: "text/event-stream",
    },
    cache: "no-store",
  })

  if (!upstreamRes.ok || !upstreamRes.body) {
    const text = await upstreamRes.text().catch(() => "")
    return new Response(text || "Upstream SSE failed", { status: upstreamRes.status })
  }

  return new Response(upstreamRes.body, {
    status: 200,
    headers: sseHeaders(),
  })
}