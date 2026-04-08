import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

function buildUpstreamPath(req: NextRequest) {
  const incoming = req.nextUrl.searchParams
  const upstreamQuery = new URLSearchParams()

  const search = incoming.get("search")
  const status = incoming.get("status")

  if (search && search.trim().length > 0) {
    upstreamQuery.set("search", search.trim())
  }

  if (status && status.trim().length > 0) {
    upstreamQuery.set("status", status.trim())
  }

  const query = upstreamQuery.toString()
  return `/api/admin/listings${query ? `?${query}` : ""}`
}

export async function GET(req: NextRequest) {
  return forwardAdminJson(req, buildUpstreamPath(req), {
    method: "GET",
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  return forwardAdminJson(req, "/api/admin/listings", {
    method: "POST",
    body,
  })
}