import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim() ?? ""
  const upstreamQuery = new URLSearchParams()

  if (query.length > 0) {
    upstreamQuery.set("query", query)
  }

  const qs = upstreamQuery.toString()

  return forwardAdminJson(req, `/api/admin/minerals${qs ? `?${qs}` : ""}`, {
    method: "GET",
  })
}