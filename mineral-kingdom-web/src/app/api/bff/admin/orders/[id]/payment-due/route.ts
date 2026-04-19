import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params

  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  return forwardAdminJson(req, `/api/admin/orders/${id}/payment-due`, {
    method: "POST",
    body,
  })
}