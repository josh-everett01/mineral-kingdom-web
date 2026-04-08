import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  return forwardAdminJson(req, `/api/admin/listings/${encodeURIComponent(id)}`, {
    method: "GET",
  })
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const body = await req.json().catch(() => ({}))

  return forwardAdminJson(req, `/api/admin/listings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  })
}