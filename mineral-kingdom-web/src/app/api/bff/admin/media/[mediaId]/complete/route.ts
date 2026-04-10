import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{
    mediaId: string
  }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { mediaId } = await context.params
  const body = await req.json().catch(() => ({}))

  return forwardAdminJson(req, `/api/admin/media/${mediaId}/complete`, {
    method: "POST",
    body,
  })
}