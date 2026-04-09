import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const query = searchParams.get("query")
  const search = searchParams.get("search")

  const upstream = new URL("/api/admin/minerals", "http://placeholder")

  if (query !== null) {
    upstream.searchParams.set("query", query)
  }

  if (search !== null) {
    upstream.searchParams.set("search", search)
  }

  return forwardAdminJson(req, `${upstream.pathname}${upstream.search}`, {
    method: "GET",
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)

  return forwardAdminJson(req, "/api/admin/minerals", {
    method: "POST",
    body,
  })
}