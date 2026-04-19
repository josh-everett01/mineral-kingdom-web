"use client"

import { useEffect, useMemo, useState } from "react"
import {
  markAdminGroupDelivered,
  markAdminGroupPacked,
  markAdminGroupShipped,
} from "@/lib/admin/fulfillment/api"
import type { AdminFulfillmentGroupDetail } from "@/lib/admin/fulfillment/types"

type Props = {
  detail: AdminFulfillmentGroupDetail
  onUpdated: () => Promise<void> | void
}

export function AdminFulfillmentActionsPanel({ detail, onUpdated }: Props) {
  const [carrier, setCarrier] = useState(detail.shippingCarrier ?? "")
  const [trackingNumber, setTrackingNumber] = useState(detail.trackingNumber ?? "")
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setCarrier(detail.shippingCarrier ?? "")
    setTrackingNumber(detail.trackingNumber ?? "")
  }, [detail.shippingCarrier, detail.trackingNumber])

  const groupId = detail.fulfillmentGroupId
  const fulfillmentStatus = (detail.fulfillmentStatus ?? "").toUpperCase()
  const invoiceStatus = (detail.shippingInvoice?.status ?? "").toUpperCase()
  const requiresShippingInvoice = detail.requiresShippingInvoice !== false

  const canPack =
    !!groupId &&
    fulfillmentStatus === "READY_TO_FULFILL" &&
    (
      !requiresShippingInvoice ||
      (
        !!detail.shippingInvoice &&
        (invoiceStatus === "PAID" || detail.shippingInvoice.amountCents === 0)
      )
    )

  const canShip = !!groupId && fulfillmentStatus === "PACKED"
  const canDeliver = !!groupId && fulfillmentStatus === "SHIPPED"

  const invoiceGateMessage = useMemo(() => {
    if (!requiresShippingInvoice) return null
    if (!detail.shippingInvoice) return "Create a shipping invoice before fulfillment actions."
    if (detail.shippingInvoice.amountCents > 0 && invoiceStatus !== "PAID") {
      return "Shipping must be paid before packing and shipping."
    }
    return null
  }, [requiresShippingInvoice, detail.shippingInvoice, invoiceStatus])

  async function handlePack() {
    try {
      setBusyAction("packed")
      setError(null)
      setSuccess(null)

      await markAdminGroupPacked(groupId)

      setSuccess("Fulfillment group marked packed.")
      await onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark packed.")
    } finally {
      setBusyAction(null)
    }
  }

  async function handleShip() {
    if (!carrier.trim()) {
      setError("Carrier is required.")
      setSuccess(null)
      return
    }

    if (!trackingNumber.trim()) {
      setError("Tracking number is required.")
      setSuccess(null)
      return
    }

    try {
      setBusyAction("shipped")
      setError(null)
      setSuccess(null)

      await markAdminGroupShipped(groupId, {
        shippingCarrier: carrier.trim(),
        trackingNumber: trackingNumber.trim(),
      })

      setSuccess("Fulfillment group marked shipped.")
      await onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark shipped.")
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDeliver() {
    try {
      setBusyAction("delivered")
      setError(null)
      setSuccess(null)

      await markAdminGroupDelivered(groupId)

      setSuccess("Fulfillment group marked delivered.")
      await onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark delivered.")
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div
      className="rounded-xl border bg-card p-5 space-y-4"
      data-testid="admin-fulfillment-actions-panel"
    >
      <div>
        <h2 className="text-lg font-semibold">Fulfillment Actions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {requiresShippingInvoice
            ? "Continue the workflow after shipping is invoiced and paid."
            : "Continue the workflow for this direct shipment."}
        </p>
      </div>

      {invoiceGateMessage ? (
        <div className="rounded-lg border p-3 text-sm text-muted-foreground">
          {invoiceGateMessage}
        </div>
      ) : null}

      {success ? (
        <div
          className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"
          data-testid="admin-fulfillment-action-success"
        >
          {success}
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800"
          data-testid="admin-fulfillment-action-error"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => void handlePack()}
          disabled={!canPack || busyAction !== null}
          className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
          data-testid="admin-fulfillment-mark-packed"
        >
          {busyAction === "packed" ? "Marking packed…" : "Mark packed"}
        </button>

        <button
          type="button"
          onClick={() => void handleDeliver()}
          disabled={!canDeliver || busyAction !== null}
          className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
          data-testid="admin-fulfillment-mark-delivered"
        >
          {busyAction === "delivered" ? "Marking delivered…" : "Mark delivered"}
        </button>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Mark shipped</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Add carrier and tracking before marking the shipment as shipped.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="shipping-carrier" className="block text-sm font-medium">
              Carrier
            </label>
            <input
              id="shipping-carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              data-testid="admin-fulfillment-shipping-carrier"
              placeholder="USPS, UPS, FedEx, etc."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="tracking-number" className="block text-sm font-medium">
              Tracking number
            </label>
            <input
              id="tracking-number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              data-testid="admin-fulfillment-tracking-number"
              placeholder="Tracking number"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleShip()}
          disabled={!canShip || busyAction !== null}
          className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
          data-testid="admin-fulfillment-mark-shipped"
        >
          {busyAction === "shipped" ? "Marking shipped…" : "Mark shipped"}
        </button>
      </div>
    </div>
  )
}