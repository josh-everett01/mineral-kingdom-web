import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{
    mediaId: string
  }>
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { mediaId } = await context.params

  return forwardAdminJson(req, `/api/admin/media/${mediaId}`, {
    method: "DELETE",
  })
}