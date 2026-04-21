import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{ userId: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await context.params

  return forwardAdminJson(req, `/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "GET",
  })
}