import { NextRequest } from "next/server"
import { forwardAdminJson } from "@/lib/api/adminUpstream"

type RouteContext = {
  params: Promise<{ invoiceId: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { invoiceId } = await context.params

  return forwardAdminJson(req, `/api/admin/shipping-invoices/${invoiceId}`, {
    method: "GET",
  })
}