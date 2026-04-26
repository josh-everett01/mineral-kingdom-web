import { type NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{ ticketId: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { ticketId } = await context.params
  const token = req.nextUrl.searchParams.get("token")
  const body = await req.json().catch(() => null)
  const upstreamPath = token
    ? `/api/support/tickets/${ticketId}/messages?token=${encodeURIComponent(token)}`
    : `/api/support/tickets/${ticketId}/messages`

  return forwardAdminJson(req, upstreamPath, { method: "POST", body })
}
