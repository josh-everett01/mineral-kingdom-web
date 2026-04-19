"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AdminFulfillmentActionsPanel } from "@/components/admin/fulfillment/AdminFulfillmentActionsPanel"
import { AdminFulfillmentPricingPanel } from "@/components/admin/fulfillment/AdminFulfillmentPricingPanel"
import { fetchAdminFulfillmentGroupDetail } from "@/lib/admin/fulfillment/api"
import type { AdminFulfillmentGroupDetail } from "@/lib/admin/fulfillment/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useParams } from "next/navigation"

function formatDate(value: string | null | undefined) {
  if (!value) return "—"

  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"

  return d.toLocaleString()
}

function formatMoney(cents: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
  }).format(cents / 100)
}

function formatBoxStatus(value: string | null | undefined) {
  switch ((value ?? "").toUpperCase()) {
    case "OPEN":
      return "Open"
    case "LOCKED_FOR_REVIEW":
      return "Box locked"
    case "CLOSED":
      return "Closed"
    default:
      return value ?? "—"
  }
}

function formatShipmentRequestStatus(value: string | null | undefined) {
  switch ((value ?? "").toUpperCase()) {
    case "NONE":
      return "No shipment requested"
    case "REQUESTED":
      return "Shipment requested"
    case "UNDER_REVIEW":
      return "Under review"
    case "INVOICED":
      return "Invoice created"
    case "PAID":
      return "Shipping paid"
    default:
      return value ?? "—"
  }
}

function formatFulfillmentStatus(value: string | null | undefined) {
  switch ((value ?? "").toUpperCase()) {
    case "READY_TO_FULFILL":
      return "Ready to fulfill"
    case "PACKED":
      return "Packed"
    case "SHIPPED":
      return "Shipped"
    case "DELIVERED":
      return "Delivered"
    default:
      return value ?? "—"
  }
}

function formatInvoiceStatus(value: string | null | undefined) {
  switch ((value ?? "").toUpperCase()) {
    case "UNPAID":
      return "Unpaid"
    case "PAID":
      return "Paid"
    case "VOID":
      return "Void"
    default:
      return value ?? "—"
  }
}

export default function AdminFulfillmentGroupDetailPage() {
  const params = useParams<{ groupId: string }>()
  const groupId = useMemo(() => String(params.groupId), [params.groupId])

  const [detail, setDetail] = useState<AdminFulfillmentGroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchAdminFulfillmentGroupDetail(groupId)
      setDetail(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fulfillment group.")
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Loading fulfillment group…
        </CardContent>
      </Card>
    )
  }

  if (error && !detail) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-red-600">{error}</CardContent>
      </Card>
    )
  }

  if (!detail) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Fulfillment group not found.
        </CardContent>
      </Card>
    )
  }

  const requiresShippingInvoice = detail.requiresShippingInvoice !== false

  return (
    <div className="space-y-6" data-testid="admin-fulfillment-detail-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Fulfillment Group</h1>
          <p className="text-sm text-muted-foreground">{detail.fulfillmentGroupId}</p>
        </div>

        <Link
          href="/admin/fulfillment"
          className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          Back to fulfillment
        </Link>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-4 text-sm text-red-600">{error}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Group Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div>Box status: {formatBoxStatus(detail.boxStatus)}</div>
          <div>Shipment request status: {formatShipmentRequestStatus(detail.shipmentRequestStatus)}</div>
          <div>Fulfillment status: {formatFulfillmentStatus(detail.fulfillmentStatus)}</div>
          <div>Requested at: {formatDate(detail.shipmentRequestedAt)}</div>
          <div>Reviewed at: {formatDate(detail.shipmentReviewedAt)}</div>
          <div>Closed at: {formatDate(detail.closedAt)}</div>
          <div>Orders in group: {detail.orderCount}</div>
          <div>
            Shipping workflow: {requiresShippingInvoice ? "Shipping invoice required" : "Direct shipment"}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="admin-fulfillment-detail-orders">
        <CardHeader>
          <CardTitle>Included Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.orders && detail.orders.length > 0 ? (
            <div className="space-y-3">
              {detail.orders.map((order) => (
                <div
                  key={order.orderId}
                  className="rounded-md border p-3 text-sm"
                >
                  <div className="font-medium">{order.orderNumber}</div>
                  <div className="text-muted-foreground">
                    Status: {order.status ?? "—"}
                  </div>
                  <div className="text-muted-foreground">
                    Total: {formatMoney(order.totalCents, order.currencyCode)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No orders are attached to this fulfillment group.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Shipment Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <div>Packed at: {formatDate(detail.packedAt)}</div>
          <div>Shipped at: {formatDate(detail.shippedAt)}</div>
          <div>Delivered at: {formatDate(detail.deliveredAt)}</div>
          <div>Carrier: {detail.shippingCarrier?.trim() || "—"}</div>
          <div className="md:col-span-2">Tracking number: {detail.trackingNumber?.trim() || "—"}</div>
        </CardContent>
      </Card>

      {requiresShippingInvoice ? (
        <>
          <AdminFulfillmentPricingPanel detail={detail} onCreated={load} />

          <Card data-testid="admin-fulfillment-detail-invoice">
            <CardHeader>
              <CardTitle>Shipping Invoice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detail.shippingInvoice ? (
                <div className="space-y-2 text-sm">
                  <div>Invoice ID: {detail.shippingInvoice.shippingInvoiceId}</div>
                  <div>
                    Amount:{" "}
                    {formatMoney(
                      detail.shippingInvoice.amountCents,
                      detail.shippingInvoice.currencyCode,
                    )}
                  </div>
                  <div>Status: {formatInvoiceStatus(detail.shippingInvoice.status)}</div>
                  <div>Paid at: {formatDate(detail.shippingInvoice.paidAt)}</div>

                  <div className="pt-2">
                    <Link
                      href={`/admin/shipping-invoices/${detail.shippingInvoice.shippingInvoiceId}`}
                      className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-muted"
                    >
                      View invoice detail
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No shipping invoice has been created yet.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card data-testid="admin-fulfillment-detail-direct-ship-note">
          <CardHeader>
            <CardTitle>Shipping Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No shipping invoice is needed for this direct shipment. Continue fulfillment with packing,
              shipping, and delivery updates.
            </p>
          </CardContent>
        </Card>
      )}

      <AdminFulfillmentActionsPanel detail={detail} onUpdated={load} />
    </div>
  )
}