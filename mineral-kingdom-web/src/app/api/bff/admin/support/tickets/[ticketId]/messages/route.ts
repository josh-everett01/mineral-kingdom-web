import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{ ticketId: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { ticketId } = await context.params
  const body = await req.json().catch(() => null)

  return forwardAdminJson(req, `/api/admin/support/tickets/${ticketId}/messages`, {
    method: "POST",
    body,
  })
}