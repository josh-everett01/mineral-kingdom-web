import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

export async function GET(req: NextRequest) {
  return forwardAdminJson(req, "/api/admin/system/jobs", {
    method: "GET",
  })
}