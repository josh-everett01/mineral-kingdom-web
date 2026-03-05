import type { NextRequest } from "next/server";
import { getAccessToken } from "@/lib/auth/cookies";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  } as const;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await ctx.params;

  const access = await getAccessToken();
  if (!access) return new Response("Unauthorized", { status: 401 });

  const upstreamUrl = `${API_BASE_URL}/api/fulfillment-groups/${groupId}/events`;
  
  const upstreamRes = await fetch(upstreamUrl, {
    headers: {
      authorization: `Bearer ${access}`,
      accept: "text/event-stream",
    },
    cache: "no-store",
  });

  if (!upstreamRes.ok || !upstreamRes.body) {
    const text = await upstreamRes.text().catch(() => "");
    return new Response(text || "Upstream SSE failed", { status: upstreamRes.status });
  }

  return new Response(upstreamRes.body, { status: 200, headers: sseHeaders() });
}