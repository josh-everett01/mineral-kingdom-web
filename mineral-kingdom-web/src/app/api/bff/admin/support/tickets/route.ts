import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const upstream = new URLSearchParams()

  const status = url.searchParams.get("status")
  const priority = url.searchParams.get("priority")
  const assignedToUserId = url.searchParams.get("assignedToUserId")
  const q = url.searchParams.get("q")
  const page = url.searchParams.get("page")
  const pageSize = url.searchParams.get("pageSize")

  if (status?.trim()) upstream.set("status", status.trim())
  if (priority?.trim()) upstream.set("priority", priority.trim())
  if (assignedToUserId?.trim()) upstream.set("assignedToUserId", assignedToUserId.trim())
  if (q?.trim()) upstream.set("q", q.trim())
  if (page?.trim()) upstream.set("page", page.trim())
  if (pageSize?.trim()) upstream.set("pageSize", pageSize.trim())

  const suffix = upstream.size > 0 ? `?${upstream.toString()}` : ""

  return forwardAdminJson(req, `/api/admin/support/tickets${suffix}`, {
    method: "GET",
  })
}