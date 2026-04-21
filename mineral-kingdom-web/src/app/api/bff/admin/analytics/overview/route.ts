import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const search = new URLSearchParams()

  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")

  if (from) search.set("from", from)
  if (to) search.set("to", to)

  const suffix = search.size > 0 ? `?${search.toString()}` : ""

  return forwardAdminJson(req, `/api/admin/analytics/overview${suffix}`, {
    method: "GET",
  })
}