"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { AdminFulfillmentActionsPanel } from "@/components/admin/fulfillment/AdminFulfillmentActionsPanel"
import { AdminFulfillmentPricingPanel } from "@/components/admin/fulfillment/AdminFulfillmentPricingPanel"
import { fetchAdminFulfillmentGroupDetail } from "@/lib/admin/fulfillment/api"
import type { AdminFulfillmentGroupDetail } from "@/lib/admin/fulfillment/types"

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

function normalizeStatus(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase()
}

function formatBoxStatus(value: string | null | undefined) {
  switch (normalizeStatus(value)) {
    case "OPEN":
      return "Open"
    case "LOCKED_FOR_REVIEW":
      return "Box locked for review"
    case "CLOSED":
      return "Closed"
    default:
      return value ?? "—"
  }
}

function formatShipmentRequestStatus(value: string | null | undefined) {
  switch (normalizeStatus(value)) {
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
  switch (normalizeStatus(value)) {
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
  switch (normalizeStatus(value)) {
    case "UNPAID":
      return "Unpaid"
    case "PAID":
      return "Paid"
    case "PROCESSING":
      return "Processing"
    case "PENDING":
      return "Pending"
    case "VOID":
    case "VOIDED":
      return "Voided"
    case "FAILED":
      return "Failed"
    default:
      return value ?? "—"
  }
}

function statusBadgeClass(status: string | null | undefined) {
  switch (normalizeStatus(status)) {
    case "PAID":
    case "READY_TO_FULFILL":
    case "DELIVERED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "UNPAID":
    case "REQUESTED":
    case "UNDER_REVIEW":
    case "AWAITING_PAYMENT":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "PROCESSING":
    case "PENDING":
    case "INVOICED":
    case "PACKED":
    case "SHIPPED":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    case "FAILED":
    case "VOID":
    case "VOIDED":
      return "border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-danger)]"
    default:
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
  }
}

function getFulfillmentCheckpoint(detail: AdminFulfillmentGroupDetail) {
  const requiresShippingInvoice = detail.requiresShippingInvoice !== false
  const invoiceStatus = normalizeStatus(detail.shippingInvoice?.status)
  const fulfillmentStatus = normalizeStatus(detail.fulfillmentStatus)

  if (!requiresShippingInvoice) {
    return {
      title: "Direct shipment workflow",
      body:
        "This fulfillment group does not require a separate shipping invoice. Continue directly through packing, shipping, and delivery updates.",
      tone: "info" as const,
    }
  }

  if (!detail.shippingInvoice) {
    return {
      title: "Shipping invoice required before fulfillment can continue",
      body:
        "Create the shipping invoice from the pricing panel below. This invoice is the customer-facing shipping payment for this fulfillment group. The customer must pay it separately from the original item or auction payment before admins should pack and ship.",
      tone: "warning" as const,
    }
  }

  if (invoiceStatus === "UNPAID") {
    return {
      title: "Shipping invoice is created and waiting for customer payment",
      body:
        "The invoice exists, but the customer has not paid shipping yet. Do not pack or ship until the invoice is backend-confirmed as paid.",
      tone: "warning" as const,
    }
  }

  if (invoiceStatus === "PROCESSING" || invoiceStatus === "PENDING") {
    return {
      title: "Shipping payment is still confirming",
      body:
        "Payment may be in progress. Wait for backend-confirmed paid status before continuing fulfillment.",
      tone: "info" as const,
    }
  }

  if (invoiceStatus === "PAID" && fulfillmentStatus === "READY_TO_FULFILL") {
    return {
      title: "Shipping invoice paid — ready to pack",
      body:
        "The customer has paid shipping for this fulfillment group. You can now pack the order and continue the fulfillment workflow.",
      tone: "success" as const,
    }
  }

  if (invoiceStatus === "PAID") {
    return {
      title: "Shipping invoice paid",
      body:
        "Shipping has been paid. Continue tracking the real-world package state through packed, shipped, and delivered.",
      tone: "success" as const,
    }
  }

  return {
    title: "Review fulfillment state",
    body:
      "Review the invoice and fulfillment statuses before taking the next operational action.",
    tone: "info" as const,
  }
}

function checkpointClass(tone: "success" | "warning" | "info") {
  switch (tone) {
    case "success":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    default:
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-ink)]"
  }
}

function DetailCell({
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
      <dd className="mt-1 break-all text-sm font-medium text-[color:var(--mk-ink)]" data-testid={testId}>
        {value}
      </dd>
    </div>
  )
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
      <div
        className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
        data-testid="admin-fulfillment-detail-page"
      >
        Loading fulfillment group…
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
        Fulfillment group not found.
      </div>
    )
  }

  const requiresShippingInvoice = detail.requiresShippingInvoice !== false
  const checkpoint = getFulfillmentCheckpoint(detail)
  const invoiceStatus = detail.shippingInvoice?.status ?? null

  return (
    <div className="space-y-6" data-testid="admin-fulfillment-detail-page">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              Admin fulfillment
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
                Fulfillment group
              </h1>

              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                  detail.fulfillmentStatus,
                )}`}
                data-testid="admin-fulfillment-detail-status"
              >
                {formatFulfillmentStatus(detail.fulfillmentStatus)}
              </span>
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text">
              Manage the operational workflow for this grouped shipment. For Open Box fulfillment,
              the item/order payment and shipping payment are separate. Creating and collecting the
              shipping invoice is the checkpoint that unlocks packing and shipping.
            </p>

            <p className="mt-2 break-all text-xs mk-muted-text">
              Fulfillment group ID: {detail.fulfillmentGroupId}
            </p>
          </div>

          <Link
            href="/admin/fulfillment"
            className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
          >
            Back to fulfillment
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
          {error}
        </div>
      ) : null}

      <section
        className={`rounded-[2rem] border p-5 text-sm shadow-sm ${checkpointClass(checkpoint.tone)}`}
        data-testid="admin-fulfillment-checkpoint"
      >
        <p className="font-semibold">{checkpoint.title}</p>
        <p className="mt-2 leading-6">{checkpoint.body}</p>

        {requiresShippingInvoice && detail.shippingInvoice ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/admin/shipping-invoices/${detail.shippingInvoice.shippingInvoiceId}`}
              className="inline-flex rounded-2xl border border-current/30 px-4 py-2 text-sm font-semibold transition hover:opacity-80"
              data-testid="admin-fulfillment-checkpoint-view-invoice"
            >
              View shipping invoice
            </Link>
          </div>
        ) : null}
      </section>

      <section className="mk-glass-strong rounded-[2rem] p-5">
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Group summary</h2>
        <p className="mt-1 text-sm leading-6 mk-muted-text">
          This summary shows where the group sits in the Open Box / fulfillment workflow.
        </p>

        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailCell label="Box status" value={formatBoxStatus(detail.boxStatus)} />
          <DetailCell
            label="Shipment request"
            value={formatShipmentRequestStatus(detail.shipmentRequestStatus)}
          />
          <DetailCell
            label="Fulfillment status"
            value={formatFulfillmentStatus(detail.fulfillmentStatus)}
          />
          <DetailCell label="Requested at" value={formatDate(detail.shipmentRequestedAt)} />
          <DetailCell label="Reviewed at" value={formatDate(detail.shipmentReviewedAt)} />
          <DetailCell label="Closed at" value={formatDate(detail.closedAt)} />
          <DetailCell label="Orders in group" value={String(detail.orderCount)} />
          <DetailCell
            label="Shipping workflow"
            value={requiresShippingInvoice ? "Shipping invoice required" : "Direct shipment"}
          />
        </dl>
      </section>

      {requiresShippingInvoice ? (
        <section className="space-y-4" data-testid="admin-fulfillment-invoice-workflow">
          <section className="mk-glass-strong rounded-[2rem] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
                  Shipping invoice checkpoint
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 mk-muted-text">
                  This is the most important step before fulfillment actions. Review the shipping
                  amount, create the invoice, then wait for customer payment. Packing and shipping
                  should stay blocked until the invoice is paid.
                </p>
              </div>

              {detail.shippingInvoice ? (
                <span
                  className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                    invoiceStatus,
                  )}`}
                  data-testid="admin-fulfillment-invoice-status"
                >
                  {formatInvoiceStatus(invoiceStatus)}
                </span>
              ) : (
                <span className="inline-flex shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                  Not created
                </span>
              )}
            </div>

            {detail.shippingInvoice ? (
              <dl className="mt-4 grid gap-4 md:grid-cols-2">
                <DetailCell label="Invoice ID" value={detail.shippingInvoice.shippingInvoiceId} />
                <DetailCell
                  label="Amount customer pays"
                  value={formatMoney(
                    detail.shippingInvoice.amountCents,
                    detail.shippingInvoice.currencyCode,
                  )}
                />
                <DetailCell
                  label="Invoice status"
                  value={formatInvoiceStatus(detail.shippingInvoice.status)}
                />
                <DetailCell label="Paid at" value={formatDate(detail.shippingInvoice.paidAt)} />

                <div className="md:col-span-2">
                  <Link
                    href={`/admin/shipping-invoices/${detail.shippingInvoice.shippingInvoiceId}`}
                    className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
                  >
                    View invoice detail
                  </Link>
                </div>
              </dl>
            ) : (
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-700 dark:text-amber-300">
                No shipping invoice has been created yet. Use the pricing panel below to create the
                invoice that the customer will pay.
              </div>
            )}
          </section>

          <AdminFulfillmentPricingPanel detail={detail} onCreated={load} />
        </section>
      ) : (
        <section
          className="rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-5 text-sm leading-6 mk-muted-text"
          data-testid="admin-fulfillment-detail-direct-ship-note"
        >
          <p className="font-semibold text-[color:var(--mk-ink)]">No shipping invoice needed</p>
          <p className="mt-2">
            This is a direct shipment workflow. Continue fulfillment with packing, shipping, and
            delivery updates.
          </p>
        </section>
      )}

      <AdminFulfillmentActionsPanel detail={detail} onUpdated={load} />

      <section className="mk-glass-strong rounded-[2rem] p-5" data-testid="admin-fulfillment-detail-orders">
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Included orders</h2>
        <p className="mt-1 text-sm leading-6 mk-muted-text">
          These are the paid orders included in this fulfillment group.
        </p>

        {detail.orders && detail.orders.length > 0 ? (
          <div className="mt-4 space-y-3">
            {detail.orders.map((order) => (
              <article
                key={order.orderId}
                className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm"
              >
                <div className="font-semibold text-[color:var(--mk-ink)]">{order.orderNumber}</div>
                <div className="mt-1 mk-muted-text">Status: {order.status ?? "—"}</div>
                <div className="mt-1 mk-muted-text">
                  Total: {formatMoney(order.totalCents, order.currencyCode)}
                </div>

                {order.shippingAddress ? (
                  <address
                    className="mt-3 not-italic mk-muted-text"
                    data-testid={`fulfillment-order-shipping-address-${order.orderId}`}
                  >
                    <div className="font-semibold text-[color:var(--mk-ink)]">Ship to</div>
                    <div>{order.shippingAddress.fullName}</div>
                    <div>{order.shippingAddress.addressLine1}</div>
                    {order.shippingAddress.addressLine2 ? (
                      <div>{order.shippingAddress.addressLine2}</div>
                    ) : null}
                    <div>
                      {order.shippingAddress.city}, {order.shippingAddress.stateOrProvince}{" "}
                      {order.shippingAddress.postalCode}
                    </div>
                    <div>{order.shippingAddress.countryCode}</div>
                  </address>
                ) : (
                  <div className="mt-3 italic mk-muted-text">No shipping address on file</div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm mk-muted-text">
            No orders are attached to this fulfillment group.
          </p>
        )}
      </section>

      <section className="mk-glass-strong rounded-[2rem] p-5">
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Shipment details</h2>
        <p className="mt-1 text-sm leading-6 mk-muted-text">
          These fields reflect the real-world package state after fulfillment actions are taken.
        </p>

        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailCell label="Packed at" value={formatDate(detail.packedAt)} />
          <DetailCell label="Shipped at" value={formatDate(detail.shippedAt)} />
          <DetailCell label="Delivered at" value={formatDate(detail.deliveredAt)} />
          <DetailCell label="Carrier" value={detail.shippingCarrier?.trim() || "—"} />
          <DetailCell label="Tracking number" value={detail.trackingNumber?.trim() || "—"} />
        </dl>
      </section>
    </div>
  )
}