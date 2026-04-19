"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { fetchAdminFulfillmentGroups } from "@/lib/admin/fulfillment/api"
import type { AdminFulfillmentListItem } from "@/lib/admin/fulfillment/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function formatDate(value: string | null) {
  if (!value) return "—"

  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"

  return d.toLocaleString()
}

function badgeClasses(kind: "requested" | "review" | "invoiced" | "paid" | "default") {
  switch (kind) {
    case "requested":
      return "bg-amber-100 text-amber-900 border border-amber-200"
    case "review":
      return "bg-blue-100 text-blue-900 border border-blue-200"
    case "invoiced":
      return "bg-purple-100 text-purple-900 border border-purple-200"
    case "paid":
      return "bg-emerald-100 text-emerald-900 border border-emerald-200"
    default:
      return "bg-muted text-foreground border border-border"
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
      <Card>
        <CardHeader>
          <CardTitle>Fulfillment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Review requested shipments, create shipping invoices, and monitor fulfillment groups.</p>
          <p>
            Queue state, shipment request state, invoice state, and fulfillment state are shown
            separately so operations can understand exactly where each group stands.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Loading fulfillment groups…
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-6 text-sm text-red-600">{error}</CardContent>
        </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No groups in this state.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.fulfillmentGroupId}
                className="rounded-lg border p-4"
                data-testid="admin-fulfillment-row"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="font-medium">{item.fulfillmentGroupId}</div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 ${badgeClasses(
                          queueBadgeKind(item.queueState),
                        )}`}
                      >
                        Queue: {queueLabel(item.queueState)}
                      </span>

                      <span
                        className={`inline-flex rounded-full px-2 py-1 ${badgeClasses(
                          shipmentBadgeKind(item.shipmentRequestStatus),
                        )}`}
                      >
                        Shipment: {item.shipmentRequestStatus}
                      </span>

                      <span className="inline-flex rounded-full border border-border bg-muted px-2 py-1">
                        Box: {item.boxStatus}
                      </span>

                      <span className="inline-flex rounded-full border border-border bg-muted px-2 py-1">
                        Fulfillment: {item.fulfillmentStatus}
                      </span>

                      {item.shippingInvoiceStatus ? (
                        <span className="inline-flex rounded-full border border-border bg-muted px-2 py-1">
                          Invoice: {item.shippingInvoiceStatus}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Orders: {item.orderCount}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Requested: {formatDate(item.shipmentRequestedAt)}
                    </div>

                    {item.shipmentReviewedAt ? (
                      <div className="text-xs text-muted-foreground">
                        Reviewed: {formatDate(item.shipmentReviewedAt)}
                      </div>
                    ) : null}

                    {item.shippingInvoicePaidAt ? (
                      <div className="text-xs text-muted-foreground">
                        Shipping paid: {formatDate(item.shippingInvoicePaidAt)}
                      </div>
                    ) : null}

                    <div className="text-xs text-muted-foreground">
                      Updated: {formatDate(item.updatedAt)}
                    </div>
                  </div>

                  <div>
                    <Link
                      href={`/admin/fulfillment/${item.fulfillmentGroupId}`}
                      className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-muted"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}