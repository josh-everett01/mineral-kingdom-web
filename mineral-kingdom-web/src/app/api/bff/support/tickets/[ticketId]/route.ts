import { type NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{ ticketId: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { ticketId } = await context.params
  const token = req.nextUrl.searchParams.get("token")
  const upstreamPath = token
    ? `/api/support/tickets/${ticketId}?token=${encodeURIComponent(token)}`
    : `/api/support/tickets/${ticketId}`

  return forwardAdminJson(req, upstreamPath, { method: "GET" })
}
