import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { slug } = await context.params

  return forwardAdminJson(req, `/api/admin/pages/${encodeURIComponent(slug)}`, {
    method: "GET",
  })
}