import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

export async function GET(req: NextRequest) {
  return forwardAdminJson(req, "/api/support/tickets", { method: "GET" })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)

  return forwardAdminJson(req, "/api/support/tickets", {
    method: "POST",
    body,
  })
}
