import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  return forwardAdminJson(
    req,
    `/api/admin/listings/${encodeURIComponent(id)}/publish`,
    {
      method: "POST",
    },
  )
}