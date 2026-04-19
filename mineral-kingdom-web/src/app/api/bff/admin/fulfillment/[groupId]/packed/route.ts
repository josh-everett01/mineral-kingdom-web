import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{ groupId: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { groupId } = await context.params

  return forwardAdminJson(req, `/api/admin/fulfillment/groups/${groupId}/packed`, {
    method: "POST",
  })
}