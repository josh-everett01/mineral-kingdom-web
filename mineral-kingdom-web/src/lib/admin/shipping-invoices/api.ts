export type AdminShippingInvoiceDetail = {
  shippingInvoiceId: string
  fulfillmentGroupId: string
  amountCents: number
  calculatedAmountCents?: number | null
  currencyCode: string
  status: string
  paidAt: string | null
  createdAt: string
  updatedAt: string
  isOverride?: boolean
  overrideReason?: string | null
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`

    try {
      const body = (await res.json()) as {
        message?: string
        details?: { error?: string }
        error?: string
      }

      message = body.details?.error ?? body.error ?? body.message ?? message
    } catch {
      // ignore
    }

    throw new Error(message)
  }

  return (await res.json()) as T
}

export async function fetchAdminShippingInvoiceDetail(
  invoiceId: string,
): Promise<AdminShippingInvoiceDetail> {
  const res = await fetch(`/api/bff/admin/shipping-invoices/${invoiceId}`, {
    method: "GET",
    cache: "no-store",
  })

  return readJson<AdminShippingInvoiceDetail>(res)
}