import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{ ticketId: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { ticketId } = await context.params

  return forwardAdminJson(req, `/api/admin/support/tickets/${ticketId}`, {
    method: "GET",
  })
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { ticketId } = await context.params
  const body = await req.json().catch(() => null)

  return forwardAdminJson(req, `/api/admin/support/tickets/${ticketId}`, {
    method: "PATCH",
    body,
  })
}