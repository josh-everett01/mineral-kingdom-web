import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const body = await req.json().catch(() => null)

  return forwardAdminJson(req, `/api/admin/listings/${id}/media/reorder`, {
    method: "PATCH",
    body,
  })
}