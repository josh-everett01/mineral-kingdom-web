import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)

  const upstream = new URLSearchParams()
  const status = url.searchParams.get("status")
  const q = url.searchParams.get("q")

  if (status?.trim()) {
    upstream.set("status", status.trim())
  }

  if (q?.trim()) {
    upstream.set("q", q.trim())
  }

  const suffix = upstream.size > 0 ? `?${upstream.toString()}` : ""

  return forwardAdminJson(req, `/api/admin/orders${suffix}`, {
    method: "GET",
  })
}