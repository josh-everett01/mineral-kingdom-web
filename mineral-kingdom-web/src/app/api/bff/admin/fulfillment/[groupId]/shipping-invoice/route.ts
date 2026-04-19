import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{ groupId: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { groupId } = await context.params

  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  return forwardAdminJson(req, `/api/admin/fulfillment/groups/${groupId}/shipping-invoice`, {
    method: "POST",
    body,
  })
}