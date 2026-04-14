import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

export async function GET(req: NextRequest) {
  const incoming = req.nextUrl.searchParams
  const upstreamQuery = new URLSearchParams()

  const status = incoming.get("status")
  const search = incoming.get("search")

  if (status?.trim()) upstreamQuery.set("status", status.trim())
  if (search?.trim()) upstreamQuery.set("search", search.trim())

  const query = upstreamQuery.toString()
  return forwardAdminJson(req, `/api/admin/auctions${query ? `?${query}` : ""}`, {
    method: "GET",
  })
}

export async function POST(req: NextRequest) {
  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  return forwardAdminJson(req, "/api/admin/auctions", {
    method: "POST",
    body,
  })
}