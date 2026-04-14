import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{ auctionId: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { auctionId } = await context.params

  return forwardAdminJson(req, `/api/admin/auctions/${auctionId}`, {
    method: "GET",
  })
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { auctionId } = await context.params

  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  return forwardAdminJson(req, `/api/admin/auctions/${auctionId}`, {
    method: "PATCH",
    body,
  })
}