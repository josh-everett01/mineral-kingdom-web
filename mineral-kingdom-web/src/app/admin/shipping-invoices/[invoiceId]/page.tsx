"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import {
  fetchAdminShippingInvoiceDetail,
  type AdminShippingInvoiceDetail,
} from "@/lib/admin/shipping-invoices/api"

function formatMoney(cents: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
  }).format(cents / 100)
}

function formatDate(value: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString()
}

export default function AdminShippingInvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>()
  const invoiceId = useMemo(() => String(params.invoiceId), [params.invoiceId])

  const [detail, setDetail] = useState<AdminShippingInvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await fetchAdminShippingInvoiceDetail(invoiceId)
        if (mounted) setDetail(data)
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load shipping invoice.")
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [invoiceId])

  if (loading) {
    return <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading shipping invoice…</div>
  }

  if (error && !detail) {
    return <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
  }

  if (!detail) {
    return <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Shipping invoice not found.</div>
  }

  return (
    <div className="space-y-6" data-testid="admin-shipping-invoice-detail-page">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Shipping Invoice</h1>
          <p className="text-sm text-muted-foreground">{detail.shippingInvoiceId}</p>
        </div>

        <Link
          href={`/admin/fulfillment/${detail.fulfillmentGroupId}`}
          className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          Back to fulfillment group
        </Link>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Invoice summary</h2>
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div>
            <div className="font-medium">Amount</div>
            <div>{formatMoney(detail.amountCents, detail.currencyCode)}</div>
          </div>

          <div>
            <div className="font-medium">Calculated amount</div>
            <div>
              {detail.calculatedAmountCents != null
                ? formatMoney(detail.calculatedAmountCents, detail.currencyCode)
                : "—"}
            </div>
          </div>

          <div>
            <div className="font-medium">Status</div>
            <div>{detail.status}</div>
          </div>

          <div>
            <div className="font-medium">Paid at</div>
            <div>{formatDate(detail.paidAt)}</div>
          </div>

          <div>
            <div className="font-medium">Created</div>
            <div>{formatDate(detail.createdAt)}</div>
          </div>

          <div>
            <div className="font-medium">Updated</div>
            <div>{formatDate(detail.updatedAt)}</div>
          </div>

          <div>
            <div className="font-medium">Override active</div>
            <div>{detail.isOverride ? "Yes" : "No"}</div>
          </div>

          <div>
            <div className="font-medium">Override reason</div>
            <div>{detail.overrideReason || "—"}</div>
          </div>
        </div>
      </section>
    </div>
  )
}