import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

function buildUpstreamPath(req: NextRequest) {
  const incoming = req.nextUrl.searchParams
  const upstreamQuery = new URLSearchParams()

  const listingId = incoming.get("listingId")
  if (listingId && listingId.trim().length > 0) {
    upstreamQuery.set("listingId", listingId.trim())
  }

  const query = upstreamQuery.toString()
  return `/api/admin/store/offers${query ? `?${query}` : ""}`
}

export async function GET(req: NextRequest) {
  return forwardAdminJson(req, buildUpstreamPath(req), {
    method: "GET",
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return forwardAdminJson(req, "/api/admin/store/offers", {
    method: "POST",
    body,
  })
}