import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  const body = await req.json().catch(() => null)

  return forwardAdminJson(req, `/api/admin/pages/${encodeURIComponent(slug)}/draft`, {
    method: "POST",
    body,
  })
}