import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params

  return forwardAdminJson(req, `/api/admin/orders/${id}/fulfillment/delivered`, {
    method: "POST",
  })
}