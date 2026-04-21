import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{ userId: string }>
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { userId } = await context.params
  const body = await req.json().catch(() => null)

  return forwardAdminJson(req, `/api/admin/users/${encodeURIComponent(userId)}/role`, {
    method: "PATCH",
    body,
  })
}