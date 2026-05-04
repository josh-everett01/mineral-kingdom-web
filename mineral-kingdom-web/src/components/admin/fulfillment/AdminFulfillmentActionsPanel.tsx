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

const adminInputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20 disabled:cursor-not-allowed disabled:opacity-60"

const adminSecondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"

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
    (!requiresShippingInvoice ||
      (!!detail.shippingInvoice &&
        (invoiceStatus === "PAID" || detail.shippingInvoice.amountCents === 0)))

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

  const nextStepMessage = useMemo(() => {
    if (invoiceGateMessage) return invoiceGateMessage

    switch (fulfillmentStatus) {
      case "READY_TO_FULFILL":
        return "Next step: pack the order after confirming the items are ready."
      case "PACKED":
        return "Next step: add carrier and tracking, then mark the shipment as shipped."
      case "SHIPPED":
        return "Next step: mark delivered after delivery is confirmed."
      case "DELIVERED":
        return "This fulfillment group has been delivered."
      default:
        return "Review the fulfillment state before taking operational action."
    }
  }, [fulfillmentStatus, invoiceGateMessage])

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
      setError("Carrier is required before marking shipped.")
      setSuccess(null)
      return
    }

    if (!trackingNumber.trim()) {
      setError("Tracking number is required before marking shipped.")
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
    <section
      className="mk-glass-strong space-y-4 rounded-[2rem] p-5"
      data-testid="admin-fulfillment-actions-panel"
    >
      <div>
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
          Fulfillment actions
        </h2>
        <p className="mt-1 text-sm leading-6 mk-muted-text">
          Move this fulfillment group through the operational workflow. Packing, shipping, and
          delivery should match the real-world package state.
        </p>
      </div>

      <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm mk-muted-text">
        <span className="font-semibold text-[color:var(--mk-ink)]">Current guidance:</span>{" "}
        {nextStepMessage}
      </div>

      {success ? (
        <div
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"
          data-testid="admin-fulfillment-action-success"
        >
          {success}
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-4 text-sm text-[color:var(--mk-danger)]"
          data-testid="admin-fulfillment-action-error"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => void handlePack()}
          disabled={!canPack || busyAction !== null}
          className={adminSecondaryButtonClass}
          data-testid="admin-fulfillment-mark-packed"
        >
          {busyAction === "packed" ? "Marking packed…" : "Mark packed"}
        </button>

        <button
          type="button"
          onClick={() => void handleDeliver()}
          disabled={!canDeliver || busyAction !== null}
          className={adminSecondaryButtonClass}
          data-testid="admin-fulfillment-mark-delivered"
        >
          {busyAction === "delivered" ? "Marking delivered…" : "Mark delivered"}
        </button>
      </div>

      <section className="space-y-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4">
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--mk-ink)]">Mark shipped</h3>
          <p className="mt-1 text-xs leading-5 mk-muted-text">
            Add the carrier and tracking number before marking the package shipped. This should only
            be done once the package has actually been handed off to the carrier.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="shipping-carrier"
              className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]"
            >
              Carrier
            </label>
            <input
              id="shipping-carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className={adminInputClass}
              data-testid="admin-fulfillment-shipping-carrier"
              placeholder="USPS, UPS, FedEx, etc."
            />
          </div>

          <div>
            <label
              htmlFor="tracking-number"
              className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]"
            >
              Tracking number
            </label>
            <input
              id="tracking-number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className={adminInputClass}
              data-testid="admin-fulfillment-tracking-number"
              placeholder="Tracking number"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleShip()}
          disabled={!canShip || busyAction !== null}
          className={adminSecondaryButtonClass}
          data-testid="admin-fulfillment-mark-shipped"
        >
          {busyAction === "shipped" ? "Marking shipped…" : "Mark shipped"}
        </button>
      </section>
    </section>
  )
}