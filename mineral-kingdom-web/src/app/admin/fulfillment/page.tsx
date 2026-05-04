"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { fetchAdminFulfillmentGroups } from "@/lib/admin/fulfillment/api"
import type { AdminFulfillmentListItem } from "@/lib/admin/fulfillment/types"

function formatDate(value: string | null) {
  if (!value) return "—"

  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"

  return d.toLocaleString()
}

function badgeClasses(kind: "requested" | "review" | "invoiced" | "paid" | "default") {
  switch (kind) {
    case "requested":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "review":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    case "invoiced":
      return "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300"
    case "paid":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    default:
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
  }
}

function shipmentBadgeKind(status: string) {
  switch ((status ?? "").toUpperCase()) {
    case "REQUESTED":
      return "requested"
    case "UNDER_REVIEW":
      return "review"
    case "INVOICED":
      return "invoiced"
    case "PAID":
      return "paid"
    default:
      return "default"
  }
}

function queueLabel(queueState: string) {
  switch ((queueState ?? "").toUpperCase()) {
    case "REQUESTED":
      return "Requested"
    case "UNDER_REVIEW":
      return "Under review"
    case "INVOICED_AWAITING_PAYMENT":
      return "Invoiced / awaiting payment"
    case "SHIPPING_PAID":
      return "Shipping paid"
    case "PACKED":
      return "Packed"
    case "SHIPPED":
      return "Shipped"
    case "DIRECT_READY":
      return "Direct shipment / ready"
    case "DIRECT_PACKED":
      return "Direct shipment / packed"
    case "DIRECT_SHIPPED":
      return "Direct shipment / shipped"
    case "DIRECT_DELIVERED":
      return "Direct shipment / delivered"
    default:
      return queueState || "Other"
  }
}

function queueBadgeKind(queueState: string): "requested" | "review" | "invoiced" | "paid" | "default" {
  switch ((queueState ?? "").toUpperCase()) {
    case "REQUESTED":
      return "requested"
    case "UNDER_REVIEW":
      return "review"
    case "INVOICED_AWAITING_PAYMENT":
      return "invoiced"
    case "SHIPPING_PAID":
    case "PACKED":
    case "SHIPPED":
    case "DIRECT_READY":
    case "DIRECT_PACKED":
    case "DIRECT_SHIPPED":
    case "DIRECT_DELIVERED":
      return "paid"
    default:
      return "default"
  }
}

function StatusBadge({ children, kind }: { children: React.ReactNode; kind: "requested" | "review" | "invoiced" | "paid" | "default" }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClasses(kind)}`}>
      {children}
    </span>
  )
}

export default function AdminFulfillmentPage() {
  const [items, setItems] = useState<AdminFulfillmentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchAdminFulfillmentGroups()
        if (!cancelled) {
          setItems(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load fulfillment groups.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

  const requestedItems = useMemo(
    () => items.filter((x) => (x.queueState ?? "").toUpperCase() === "REQUESTED"),
    [items],
  )

  const reviewItems = useMemo(
    () => items.filter((x) => (x.queueState ?? "").toUpperCase() === "UNDER_REVIEW"),
    [items],
  )

  const invoicedItems = useMemo(
    () => items.filter((x) => (x.queueState ?? "").toUpperCase() === "INVOICED_AWAITING_PAYMENT"),
    [items],
  )

  const paidItems = useMemo(
    () => items.filter((x) => (x.queueState ?? "").toUpperCase() === "SHIPPING_PAID"),
    [items],
  )

  const directReadyItems = useMemo(
    () => items.filter((x) => (x.queueState ?? "").toUpperCase() === "DIRECT_READY"),
    [items],
  )

  const directPackedItems = useMemo(
    () => items.filter((x) => (x.queueState ?? "").toUpperCase() === "DIRECT_PACKED"),
    [items],
  )

  const directShippedItems = useMemo(
    () => items.filter((x) => (x.queueState ?? "").toUpperCase() === "DIRECT_SHIPPED"),
    [items],
  )

  const directDeliveredItems = useMemo(
    () => items.filter((x) => (x.queueState ?? "").toUpperCase() === "DIRECT_DELIVERED"),
    [items],
  )

  return (
    <div className="space-y-6" data-testid="admin-fulfillment-page">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Admin fulfillment
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
          Fulfillment
        </h1>

        <div className="mt-2 max-w-3xl space-y-2 text-sm leading-6 mk-muted-text">
          <p>Review requested shipments, create shipping invoices, and monitor fulfillment groups.</p>
          <p>
            Queue state, shipment request state, invoice state, and fulfillment state are shown
            separately so operations can understand exactly where each group stands.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text">
          Loading fulfillment groups…
        </div>
      ) : error ? (
        <div className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
          {error}
        </div>
      ) : (
        <>
          <FulfillmentSection title="Requested Shipments" items={requestedItems} />
          <FulfillmentSection title="Under Review" items={reviewItems} />
          <FulfillmentSection title="Invoiced / Awaiting Payment" items={invoicedItems} />
          <FulfillmentSection title="Shipping Paid" items={paidItems} />
          <FulfillmentSection title="Direct Ship / Ready to Fulfill" items={directReadyItems} />
          <FulfillmentSection title="Direct Ship / Packed" items={directPackedItems} />
          <FulfillmentSection title="Direct Ship / Shipped" items={directShippedItems} />
          <FulfillmentSection title="Direct Ship / Delivered" items={directDeliveredItems} />
        </>
      )}
    </div>
  )
}

function FulfillmentSection({
  title,
  items,
}: {
  title: string
  items: AdminFulfillmentListItem[]
}) {
  return (
    <section className="mk-glass-strong rounded-[2rem] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">{title}</h2>
          <p className="mt-1 text-sm mk-muted-text">
            {items.length} group{items.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm mk-muted-text">
          No groups in this state.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.fulfillmentGroupId}
              className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
              data-testid="admin-fulfillment-row"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="break-all font-semibold text-[color:var(--mk-ink)]">
                    {item.fulfillmentGroupId}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <StatusBadge kind={queueBadgeKind(item.queueState)}>
                      Queue: {queueLabel(item.queueState)}
                    </StatusBadge>

                    <StatusBadge kind={shipmentBadgeKind(item.shipmentRequestStatus)}>
                      Shipment: {item.shipmentRequestStatus}
                    </StatusBadge>

                    <StatusBadge kind="default">Box: {item.boxStatus}</StatusBadge>

                    <StatusBadge kind="default">
                      Fulfillment: {item.fulfillmentStatus}
                    </StatusBadge>

                    {item.shippingInvoiceStatus ? (
                      <StatusBadge kind="default">
                        Invoice: {item.shippingInvoiceStatus}
                      </StatusBadge>
                    ) : null}
                  </div>

                  <div className="grid gap-2 text-sm mk-muted-text sm:grid-cols-2">
                    <div>Orders: {item.orderCount}</div>
                    <div>Requested: {formatDate(item.shipmentRequestedAt)}</div>

                    {item.shipmentReviewedAt ? (
                      <div>Reviewed: {formatDate(item.shipmentReviewedAt)}</div>
                    ) : null}

                    {item.shippingInvoicePaidAt ? (
                      <div>Shipping paid: {formatDate(item.shippingInvoicePaidAt)}</div>
                    ) : null}

                    <div>Updated: {formatDate(item.updatedAt)}</div>
                  </div>
                </div>

                <div className="shrink-0">
                  <Link
                    href={`/admin/fulfillment/${item.fulfillmentGroupId}`}
                    className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
                  >
                    View details
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}