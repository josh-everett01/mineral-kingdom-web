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

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "").trim().toUpperCase()
}

function statusClass(status: string) {
  switch (normalizeStatus(status)) {
    case "PAID":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "UNPAID":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "PROCESSING":
    case "PENDING":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    case "VOID":
    case "VOIDED":
    case "CANCELLED":
    case "FAILED":
      return "border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-danger)]"
    default:
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
  }
}

function statusLabel(status: string) {
  switch (normalizeStatus(status)) {
    case "PAID":
      return "Paid"
    case "UNPAID":
      return "Unpaid"
    case "PROCESSING":
      return "Processing"
    case "PENDING":
      return "Pending"
    case "VOID":
    case "VOIDED":
      return "Voided"
    case "CANCELLED":
      return "Cancelled"
    case "FAILED":
      return "Failed"
    default:
      return status || "Unknown"
  }
}

function nextStepMessage(detail: AdminShippingInvoiceDetail) {
  const status = normalizeStatus(detail.status)

  if (status === "PAID") {
    return "Shipping has been paid. The fulfillment group can continue through packing, shipping, and delivery."
  }

  if (status === "UNPAID") {
    return "Customer still needs to pay this shipping invoice before fulfillment should proceed."
  }

  if (status === "PROCESSING" || status === "PENDING") {
    return "Payment may be in progress. Wait for backend-confirmed payment state before continuing fulfillment."
  }

  if (status === "VOID" || status === "VOIDED" || status === "CANCELLED" || status === "FAILED") {
    return "This invoice is not payable in its current state. Review the fulfillment group before taking the next action."
  }

  return "Review the invoice status and fulfillment group before taking the next operational step."
}

function DetailItem({
  label,
  value,
  testId,
}: {
  label: string
  value: string
  testId?: string
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
        {label}
      </dt>
      <dd
        className="mt-1 break-all text-sm font-medium text-[color:var(--mk-ink)]"
        data-testid={testId}
      >
        {value}
      </dd>
    </div>
  )
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
    return (
      <div
        className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
        data-testid="admin-shipping-invoice-detail-page"
      >
        Loading shipping invoice…
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
        {error}
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text">
        Shipping invoice not found.
      </div>
    )
  }

  const invoiceAmount = formatMoney(detail.amountCents, detail.currencyCode)
  const calculatedAmount =
    detail.calculatedAmountCents != null
      ? formatMoney(detail.calculatedAmountCents, detail.currencyCode)
      : "—"

  return (
    <div className="space-y-6" data-testid="admin-shipping-invoice-detail-page">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              Admin shipping invoice
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
                Shipping invoice
              </h1>

              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                  detail.status,
                )}`}
                data-testid="admin-shipping-invoice-status"
              >
                {statusLabel(detail.status)}
              </span>
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text">
              This invoice is for fulfillment shipping only. It is separate from the original item
              or auction payment. For Open Box and grouped fulfillment, the buyer pays item/order
              costs first, then pays this shipping invoice before the shipment proceeds.
            </p>

            <p className="mt-2 break-all text-xs mk-muted-text">
              Invoice ID: {detail.shippingInvoiceId}
            </p>
          </div>

          <Link
            href={`/admin/fulfillment/${detail.fulfillmentGroupId}`}
            className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
          >
            Back to fulfillment group
          </Link>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-5 text-sm shadow-sm">
        <p className="font-semibold text-[color:var(--mk-ink)]">Current guidance</p>
        <p className="mt-2 leading-6 mk-muted-text">{nextStepMessage(detail)}</p>
      </section>

      <section className="mk-glass-strong rounded-[2rem] p-5">
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Invoice summary</h2>
        <p className="mt-1 text-sm leading-6 mk-muted-text">
          Compare the calculated shipping amount with the amount charged to the customer. Overrides
          should include a reason so the adjustment is understandable later.
        </p>

        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailItem
            label="Amount customer pays"
            value={invoiceAmount}
            testId="admin-shipping-invoice-amount"
          />

          <DetailItem
            label="Calculated shipping"
            value={calculatedAmount}
            testId="admin-shipping-invoice-calculated-amount"
          />

          <DetailItem
            label="Status"
            value={statusLabel(detail.status)}
            testId="admin-shipping-invoice-summary-status"
          />

          <DetailItem
            label="Paid at"
            value={formatDate(detail.paidAt)}
            testId="admin-shipping-invoice-paid-at"
          />

          <DetailItem label="Created" value={formatDate(detail.createdAt)} />

          <DetailItem label="Updated" value={formatDate(detail.updatedAt)} />

          <DetailItem
            label="Override active"
            value={detail.isOverride ? "Yes" : "No"}
            testId="admin-shipping-invoice-override-active"
          />

          <DetailItem
            label="Override reason"
            value={detail.overrideReason || "—"}
            testId="admin-shipping-invoice-override-reason"
          />
        </dl>
      </section>

      {detail.isOverride ? (
        <section
          className="rounded-[2rem] border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-700 dark:text-amber-300"
          data-testid="admin-shipping-invoice-override-note"
        >
          <p className="font-semibold">Manual shipping override applied</p>
          <p className="mt-2 leading-6">
            The customer-facing shipping amount differs from the calculated amount. Keep the
            override reason clear so future admins can understand why this amount was used.
          </p>
        </section>
      ) : null}
    </div>
  )
}