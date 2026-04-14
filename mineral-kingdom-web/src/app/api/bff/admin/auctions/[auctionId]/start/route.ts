import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{ auctionId: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { auctionId } = await context.params

  return forwardAdminJson(req, `/api/admin/auctions/${auctionId}/start`, {
    method: "POST",
  })
}