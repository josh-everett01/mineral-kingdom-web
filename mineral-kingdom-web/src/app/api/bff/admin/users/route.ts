import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const search = new URLSearchParams()

  const email = url.searchParams.get("email")
  if (email?.trim()) {
    search.set("email", email.trim())
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : ""

  return forwardAdminJson(req, `/api/admin/users${suffix}`, {
    method: "GET",
  })
}