"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminOrderRefundPanel } from "@/components/admin/orders/AdminOrderRefundPanel"
import { getAdminOrder } from "@/lib/admin/orders/api"
import type { AdminOrderDetail } from "@/lib/admin/orders/types"

type Props = {
  id: string
}

function formatMoney(cents: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
  }).format(cents / 100)
}

function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function refundState(detail: AdminOrderDetail) {
  if (detail.isFullyRefunded) return "Refunded"
  if (detail.isPartiallyRefunded) return "Partially refunded"
  return "Not refunded"
}

function refundStateClass(detail: AdminOrderDetail) {
  if (detail.isFullyRefunded) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  }

  if (detail.isPartiallyRefunded) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  }

  return "border-muted bg-muted text-muted-foreground"
}

function statusClass(status: string) {
  switch (status.toUpperCase()) {
    case "READY_TO_FULFILL":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "AWAITING_PAYMENT":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "REFUNDED":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    default:
      return "border-muted bg-muted text-muted-foreground"
  }
}

function DetailItem({
  label,
  value,
  testId,
}: {
  label: string
  value?: string | null
  testId?: string
}) {
  return (
    <div>
      <dt className="font-medium text-foreground">{label}</dt>
      <dd data-testid={testId} className="mt-1 text-muted-foreground">
        {value?.trim() || "—"}
      </dd>
    </div>
  )
}

export function AdminOrderDetailPage({ id }: Props) {
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAdminOrder(id)
      setDetail(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load order.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const paymentSummary = useMemo(() => {
    if (!detail) return null
    const paidLabel = detail.paidAt ? `Paid ${formatDate(detail.paidAt)}` : "Not paid"
    const dueLabel = detail.paymentDueAt ? `Due ${formatDate(detail.paymentDueAt)}` : "No payment due date"
    return { paidLabel, dueLabel }
  }, [detail])

  if (isLoading) {
    return (
      <div
        data-testid="admin-order-detail-page"
        className="rounded-xl border bg-card p-6 text-sm text-muted-foreground"
      >
        Loading order…
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Order not found.
      </div>
    )
  }

  return (
    <div data-testid="admin-order-detail-page" className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1
              data-testid="admin-order-detail-order-number"
              className="text-2xl font-semibold"
            >
              {detail.orderNumber}
            </h1>

            <span
              data-testid="admin-order-detail-status"
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                detail.status,
              )}`}
            >
              {detail.status}
            </span>

            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${refundStateClass(
                detail,
              )}`}
            >
              {refundState(detail)}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            Review payment context, refund history, and operational order information.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Order summary</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <DetailItem
                label="Customer email"
                value={detail.customerEmail}
                testId="admin-order-detail-customer-email"
              />
              <DetailItem label="Source type" value={detail.sourceType} />
              <DetailItem label="Order id" value={detail.id} />
              <DetailItem label="Auction id" value={detail.auctionId} />
              <DetailItem label="Shipping mode" value={detail.shippingMode} />
              <DetailItem label="Created" value={formatDate(detail.createdAt)} />
              <DetailItem label="Updated" value={formatDate(detail.updatedAt)} />
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Payment context</h2>
            <div
              data-testid="admin-order-detail-payment-context"
              className="grid gap-4 md:grid-cols-2"
            >
              <DetailItem
                label="Subtotal"
                value={formatMoney(detail.subtotalCents, detail.currencyCode)}
              />
              <DetailItem
                label="Discounts"
                value={formatMoney(detail.discountTotalCents, detail.currencyCode)}
              />
              <DetailItem
                label="Shipping"
                value={formatMoney(detail.shippingAmountCents, detail.currencyCode)}
              />
              <DetailItem
                label="Total"
                value={formatMoney(detail.totalCents, detail.currencyCode)}
              />
              <DetailItem
                label="Total refunded"
                value={formatMoney(detail.totalRefundedCents, detail.currencyCode)}
              />
              <DetailItem
                label="Remaining refundable"
                value={formatMoney(detail.remainingRefundableCents, detail.currencyCode)}
              />
              <DetailItem label="Paid at" value={paymentSummary?.paidLabel ?? "—"} />
              <DetailItem label="Payment due" value={paymentSummary?.dueLabel ?? "—"} />
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold">Provider payments</h3>

              {detail.payments.length === 0 ? (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                  No provider payments recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {detail.payments.map((payment) => (
                    <div
                      key={`${payment.provider}-${payment.providerPaymentId ?? payment.createdAt}`}
                      className="rounded-lg border p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">{payment.provider}</div>
                        <div className="text-muted-foreground">{payment.status}</div>
                      </div>
                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="text-muted-foreground">Amount</div>
                          <div>{formatMoney(payment.amountCents, payment.currencyCode)}</div>
                        </div>

                        <div>
                          <div className="text-muted-foreground">Created</div>
                          <div>{formatDate(payment.createdAt)}</div>
                        </div>

                        <div>
                          <div className="text-muted-foreground">Checkout id</div>
                          <div className="break-all text-xs">{payment.providerCheckoutId || "—"}</div>
                        </div>

                        <div>
                          <div className="text-muted-foreground">Payment id</div>
                          <div className="break-all text-xs">{payment.providerPaymentId || "—"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Refund history</h2>

            <div data-testid="admin-order-detail-refund-history">
              {detail.refundHistory.length === 0 ? (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                  No refunds recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {detail.refundHistory.map((refund) => (
                    <div
                      key={refund.refundId}
                      className="rounded-lg border p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">
                          {formatMoney(refund.amountCents, refund.currencyCode)}
                        </div>
                        <div className="text-muted-foreground">
                          {formatDate(refund.createdAt)}
                        </div>
                      </div>

                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div>Provider: {refund.provider}</div>
                        <div>Refund id: {refund.providerRefundId || "—"}</div>
                        <div className="md:col-span-2">
                          Reason: {refund.reason || "—"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Refund action</h2>
            <div data-testid="admin-order-detail-refund-action">
              {detail.canRefund ? (
                <AdminOrderRefundPanel detail={detail} onRefunded={load} />
              ) : (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                  Refunds are not available for this order or your role does not allow refunds.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}