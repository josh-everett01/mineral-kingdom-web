"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { OpenBoxShipmentStatusNotice } from "@/components/open-box/OpenBoxShipmentStatusNotice"
import type {
  OpenBoxDto,
  OpenBoxOrderItemDto,
  OpenBoxShippingInvoiceDto,
} from "@/lib/open-box/types"

type LoadableError = {
  status?: number
  message?: string
  error?: string
  code?: string
}

type OpenBoxWithShipmentStatus = OpenBoxDto & {
  shipmentRequestStatus?: string | null
}

function formatMoney(cents?: number | null, currencyCode?: string | null) {
  if (cents == null) return "—"

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode ?? "USD",
  }).format(cents / 100)
}

function formatDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

function displayOpenBoxStatus(openBox: OpenBoxDto | null) {
  const boxStatus = (openBox?.boxStatus ?? "").trim().toUpperCase()
  const fulfillmentStatus = (openBox?.fulfillmentStatus ?? "").trim().toUpperCase()

  if (
    boxStatus === "OPEN" ||
    boxStatus === "CLOSED" ||
    boxStatus === "LOCKED_FOR_REVIEW" ||
    boxStatus === "SHIPPED"
  ) {
    return boxStatus
  }

  if (fulfillmentStatus === "SHIPPED") return "SHIPPED"

  return "OPEN"
}

function statusToneClasses(status: string) {
  switch (status) {
    case "OPEN":
      return "border-[color:var(--mk-sky)]/40 bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-ink)]"
    case "CLOSED":
    case "LOCKED_FOR_REVIEW":
      return "border-[color:var(--mk-gold)]/50 bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-ink)]"
    case "SHIPPED":
      return "border-[color:var(--mk-success)]/40 bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-ink)]"
    default:
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-ink)]"
  }
}

function statusAccentClass(status: string) {
  switch (status) {
    case "OPEN":
      return "text-[color:var(--mk-sky)]"
    case "CLOSED":
    case "LOCKED_FOR_REVIEW":
      return "text-[color:var(--mk-gold)]"
    case "SHIPPED":
      return "text-[color:var(--mk-success)]"
    default:
      return "text-[color:var(--mk-gold)]"
  }
}

function statusTitle(status: string) {
  switch (status) {
    case "OPEN":
      return "Your Open Box is active"
    case "CLOSED":
      return "Your Open Box has been closed"
    case "LOCKED_FOR_REVIEW":
      return "Your shipment request has been submitted"
    case "SHIPPED":
      return "Your Open Box shipment has shipped"
    default:
      return "Open Box"
  }
}

function statusDescription(status: string, hasInvoice: boolean) {
  switch (status) {
    case "OPEN":
      return "Eligible purchases can continue to be grouped together before shipping is finalized."
    case "CLOSED":
      return hasInvoice
        ? "Your shipment has been finalized and shipping is now ready to be paid."
        : "Your shipment has been closed and is being finalized. A shipping invoice will appear here when ready."
    case "LOCKED_FOR_REVIEW":
      return hasInvoice
        ? "Your shipment request has been reviewed and a shipping invoice is now available."
        : "We received your shipment request. Our team will review the items in your box and create a shipping invoice next."
    case "SHIPPED":
      return "This Open Box shipment has already gone out. Detailed tracking belongs to the fulfillment flow."
    default:
      return "Open Box helps you combine eligible purchases into one shipment."
  }
}

function normalizeInvoiceStatus(value?: string | null) {
  return (value ?? "").trim().toUpperCase()
}

function shouldShowInvoiceForOpenBox(status: string) {
  return status === "CLOSED" || status === "LOCKED_FOR_REVIEW" || status === "SHIPPED"
}

function normalizeStatus(value?: string | null) {
  return (value ?? "").trim().toUpperCase()
}

function normalizeShippingMode(value?: string | null) {
  return (value ?? "").trim().toUpperCase()
}

function formatOrderStatus(value?: string | null) {
  switch (normalizeStatus(value)) {
    case "AWAITING_PAYMENT":
      return "Awaiting payment"
    case "READY_TO_FULFILL":
      return "Ready to fulfill"
    case "PACKED":
      return "Packed"
    case "SHIPPED":
      return "Shipped"
    case "DELIVERED":
      return "Delivered"
    case "COMPLETED":
      return "Completed"
    default:
      return value ?? "—"
  }
}

function formatShippingMode(value?: string | null) {
  switch (normalizeShippingMode(value)) {
    case "UNSELECTED":
      return "Shipping choice needed"
    case "SHIP_NOW":
      return "Direct shipment"
    case "OPEN_BOX":
      return "Open Box"
    default:
      return "Shipping details pending"
  }
}

function buildOrderTitle(order: OpenBoxOrderItemDto) {
  const title = order.previewTitle?.trim()
  const count = order.itemCount ?? 0

  if (title && count > 1) {
    return `${title} + ${count - 1} more`
  }

  if (title) return title
  if (count > 1) return `${count} items`
  if (count === 1) return "1 item"

  return order.orderNumber
}

function OrderRow({ order }: { order: OpenBoxOrderItemDto }) {
  return (
    <li
      className="flex flex-col gap-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] p-4 sm:flex-row sm:items-start"
      data-testid="open-box-order-row"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)]">
        {order.previewImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={order.previewImageUrl}
            alt={order.previewTitle ?? order.orderNumber}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="px-2 text-center text-[11px] font-semibold text-[color:var(--mk-gold)]">
            Order
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[color:var(--mk-ink)]">
          {buildOrderTitle(order)}
        </p>
        <p className="mt-1 text-sm mk-muted-text">
          Order {order.orderNumber} • {order.sourceType === "AUCTION" ? "Auction" : "Store"}
        </p>
        <p className="mt-1 text-sm mk-muted-text">
          {formatOrderStatus(order.status)}
          {order.shippingMode ? ` • ${formatShippingMode(order.shippingMode)}` : ""}
        </p>
        <p className="mt-1 text-sm font-semibold text-[color:var(--mk-ink)]">
          {formatMoney(order.totalCents, order.currencyCode)}
        </p>
      </div>

      <Link
        href={`/orders/${order.orderId}`}
        className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel)]"
        data-testid={`open-box-order-${order.orderId}-view`}
      >
        View
      </Link>
    </li>
  )
}

export function OpenBoxClient() {
  const [openBox, setOpenBox] = useState<OpenBoxDto | null>(null)
  const [invoice, setInvoice] = useState<OpenBoxShippingInvoiceDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [isClosingBox, setIsClosingBox] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [closeSuccess, setCloseSuccess] = useState<string | null>(null)

  const load = useCallback(async (isMounted?: () => boolean) => {
    setIsLoading(true)
    setError(null)
    setErrorStatus(null)
    setSessionExpired(false)

    try {
      const [openBoxRes, invoiceRes] = await Promise.all([
        fetch("/api/bff/me/open-box", { cache: "no-store" }),
        fetch("/api/bff/me/open-box/shipping-invoice", { cache: "no-store" }),
      ])

      const openBoxBody = (await openBoxRes.json().catch(() => null)) as
        | OpenBoxDto
        | LoadableError
        | null

      const invoiceBody = (await invoiceRes.json().catch(() => null)) as
        | OpenBoxShippingInvoiceDto
        | LoadableError
        | null

      if (isMounted && !isMounted()) return

      if (openBoxRes.status === 401 || invoiceRes.status === 401) {
        setSessionExpired(true)
        setErrorStatus(401)
        setError("Your session expired. Please sign in again.")
        setIsLoading(false)
        return
      }

      if (openBoxRes.status === 404) {
        setOpenBox(null)
        setInvoice(
          invoiceRes.ok && invoiceBody && "shippingInvoiceId" in invoiceBody ? invoiceBody : null,
        )
        setIsLoading(false)
        return
      }

      if (!openBoxRes.ok || !openBoxBody || !("fulfillmentGroupId" in openBoxBody)) {
        setErrorStatus(openBoxRes.status)
        setError(
          (openBoxBody &&
            "message" in openBoxBody &&
            typeof openBoxBody.message === "string" &&
            openBoxBody.message) ||
          (openBoxBody &&
            "error" in openBoxBody &&
            typeof openBoxBody.error === "string" &&
            openBoxBody.error) ||
          "We couldn’t load your Open Box.",
        )
        setIsLoading(false)
        return
      }

      setOpenBox(openBoxBody)
      setInvoice(
        invoiceRes.ok && invoiceBody && "shippingInvoiceId" in invoiceBody ? invoiceBody : null,
      )
      setIsLoading(false)
    } catch {
      if (isMounted && !isMounted()) return
      setErrorStatus(500)
      setError("We couldn’t load your Open Box.")
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    void load(() => mounted)

    return () => {
      mounted = false
    }
  }, [load])

  const openBoxStatus = useMemo(() => displayOpenBoxStatus(openBox), [openBox])
  const toneClasses = statusToneClasses(openBoxStatus)
  const accentClass = statusAccentClass(openBoxStatus)
  const invoiceStatus = normalizeInvoiceStatus(invoice?.status)
  const showInvoiceForCurrentBox = shouldShowInvoiceForOpenBox(openBoxStatus)
  const visibleInvoice = showInvoiceForCurrentBox ? invoice : null
  const hasInvoice = visibleInvoice != null
  const isInvoicePayable = invoiceStatus === "UNPAID"
  const isInvoicePaid = invoiceStatus === "PAID"
  const canRequestShipment = openBoxStatus === "OPEN" && (openBox?.orderCount ?? 0) > 0
  const isBoxLocked = openBoxStatus === "LOCKED_FOR_REVIEW" || openBoxStatus === "SHIPPED"

  const openBoxSupportHref = visibleInvoice?.shippingInvoiceId
    ? `/support/new?shippingInvoiceId=${encodeURIComponent(visibleInvoice.shippingInvoiceId)}&category=OPEN_BOX_HELP`
    : "/support/new?category=OPEN_BOX_HELP"

  const shipmentRequestStatus =
    (openBox as OpenBoxWithShipmentStatus | null)?.shipmentRequestStatus ?? null

  async function handleCloseBox() {
    setCloseError(null)
    setCloseSuccess(null)
    setIsClosingBox(true)

    try {
      const res = await fetch("/api/bff/me/open-box/close", {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      })

      const body = (await res.json().catch(() => null)) as LoadableError | null

      if (res.status === 401) {
        setSessionExpired(true)
        setErrorStatus(401)
        setError("Your session expired. Please sign in again.")
        return
      }

      if (!res.ok) {
        setCloseError(
          body?.message ||
          body?.error ||
          "We couldn’t request shipment for this Open Box right now.",
        )
        return
      }

      setCloseSuccess(
        "Your shipment request has been submitted. We’ll review it and create a shipping invoice next.",
      )

      await load()
    } catch {
      setCloseError("We couldn’t request shipment for this Open Box right now.")
    } finally {
      setIsClosingBox(false)
    }
  }

  if (isLoading) {
    return (
      <section className="mk-glass-strong rounded-[2rem] p-6" data-testid="open-box-loading">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Open Box
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
          Loading your Open Box
        </h1>
        <p className="mt-2 text-sm leading-6 mk-muted-text">Loading Open Box…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section
        className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-6 shadow-sm"
        data-testid="open-box-error"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-danger)]">
          Open Box
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[color:var(--mk-ink)]">
          We couldn’t load your Open Box
        </h1>
        <p className="mt-2 text-sm leading-6 text-[color:var(--mk-danger)]">{error}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          {sessionExpired || errorStatus === 401 ? (
            <Link
              href="/login?returnTo=%2Fopen-box"
              className="mk-cta inline-flex rounded-2xl px-4 py-2 text-sm font-semibold"
              data-testid="open-box-sign-in-again"
            >
              Sign in again
            </Link>
          ) : null}

          <Link
            href="/dashboard"
            className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
            data-testid="open-box-back-dashboard"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    )
  }

  if (!openBox) {
    return (
      <section className="mk-glass-strong space-y-6 rounded-[2rem] p-6" data-testid="open-box-empty">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
            Open Box
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
            You do not have an Open Box yet
          </h1>
          <p className="mt-3 text-sm leading-6 mk-muted-text sm:text-base">
            Open Box lets you combine eligible purchases into one shipment. When you keep an item in
            Open Box, it will appear here.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
            data-testid="open-box-empty-dashboard"
          >
            Back to dashboard
          </Link>
          <Link
            href="/shop"
            className="mk-cta inline-flex rounded-2xl px-4 py-2 text-sm font-semibold"
            data-testid="open-box-empty-shop"
          >
            Browse shop
          </Link>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-6" data-testid="open-box-page">
      <section className="mk-glass-strong rounded-[2rem] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Open Box
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
          Combined shipping made simple
        </h1>
        <p className="mt-3 text-sm leading-6 mk-muted-text sm:text-base">
          Open Box lets you combine eligible purchases into one shipment. This page shows what is
          currently grouped together and what the next step is.
        </p>
      </section>

      {closeSuccess ? (
        <div
          className="rounded-2xl border border-[color:var(--mk-success)]/40 bg-[color:var(--mk-panel-muted)] px-4 py-3 text-sm text-[color:var(--mk-success)]"
          data-testid="open-box-close-success"
        >
          {closeSuccess}
        </div>
      ) : null}

      <section
        className={`rounded-[2rem] border p-5 shadow-sm ${toneClasses}`}
        data-testid="open-box-status-card"
      >
        <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${accentClass}`}>
          Status
        </p>
        <h2 className="mt-2 text-xl font-semibold" data-testid="open-box-status">
          {openBoxStatus}
        </h2>
        <p className="mt-2 text-sm font-semibold">{statusTitle(openBoxStatus)}</p>
        <p className="mt-2 text-sm leading-6 mk-muted-text">
          {statusDescription(openBoxStatus, hasInvoice)}
        </p>
        {openBox.closedAt ? (
          <p className="mt-3 text-xs mk-muted-text">
            Closed {formatDate(openBox.closedAt) ?? "recently"}
          </p>
        ) : null}
      </section>

      {isBoxLocked ? (
        <OpenBoxShipmentStatusNotice
          shipmentRequestStatus={shipmentRequestStatus}
          hasInvoice={hasInvoice}
          invoicePaid={isInvoicePaid}
        />
      ) : null}

      <section
        className="rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
        data-testid="open-box-items"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
            Orders in your Open Box
          </h2>
          <p className="text-sm mk-muted-text">
            {openBox.orderCount} order{openBox.orderCount === 1 ? "" : "s"}
          </p>
        </div>

        {openBox.orders.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {openBox.orders.map((order) => (
              <OrderRow key={order.orderId} order={order} />
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm mk-muted-text" data-testid="open-box-items-empty">
            Your Open Box exists, but orders are not visible yet.
          </p>
        )}
      </section>

      {canRequestShipment ? (
        <section
          className="rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
          data-testid="open-box-request-shipment"
        >
          <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
            Ready to ship these items?
          </h2>
          <p className="mt-2 text-sm leading-6 mk-muted-text">
            This will submit your shipment request for the items shown here. Shipping is not charged
            yet. We’ll review your box and create a shipping invoice next.
          </p>

          {closeError ? (
            <div
              className="mt-4 rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-danger)]"
              data-testid="open-box-close-error"
            >
              {closeError}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleCloseBox()}
              disabled={isClosingBox}
              className="mk-cta inline-flex rounded-2xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="open-box-close-button"
            >
              {isClosingBox ? "Submitting request…" : "Ship all items now"}
            </button>
          </div>
        </section>
      ) : null}

      <section
        className="rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
        data-testid="open-box-invoice-section"
      >
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Shipping invoice</h2>

        {!showInvoiceForCurrentBox ? (
          <p className="mt-2 text-sm leading-6 mk-muted-text" data-testid="open-box-no-invoice">
            Shipping will be billed after you request shipment for your Open Box.
          </p>
        ) : visibleInvoice ? (
          <>
            <p className="mt-2 text-sm leading-6 mk-muted-text">
              {isInvoicePayable
                ? "Your Open Box shipping invoice is ready."
                : isInvoicePaid
                  ? "Shipping has already been paid for this Open Box shipment."
                  : "Your Open Box shipping invoice is available."}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] p-4">
              <div>
                <p className="text-sm font-semibold text-[color:var(--mk-ink)]">
                  {formatMoney(visibleInvoice.amountCents, visibleInvoice.currencyCode)}
                </p>
                <p className="mt-1 text-sm mk-muted-text">Status: {visibleInvoice.status}</p>
              </div>

              <Link
                href={`/shipping-invoices/${visibleInvoice.shippingInvoiceId}`}
                className="mk-cta inline-flex rounded-2xl px-4 py-2 text-sm font-semibold"
                data-testid="open-box-pay-shipping"
              >
                {isInvoicePayable ? "Pay shipping" : "View invoice"}
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm leading-6 mk-muted-text" data-testid="open-box-no-invoice">
            {openBoxStatus === "LOCKED_FOR_REVIEW"
              ? "Your shipment request is under review. A shipping invoice will appear here when ready."
              : openBoxStatus === "CLOSED"
                ? "Your shipment is being finalized. A shipping invoice will appear here when ready."
                : openBoxStatus === "SHIPPED"
                  ? "Shipping payment is no longer needed for this Open Box shipment."
                  : "Shipping will be billed after you request shipment for your Open Box."}
          </p>
        )}
      </section>

      <section
        className="rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
        data-testid="open-box-support"
      >
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Need help?</h2>
        <p className="mt-2 text-sm leading-6 mk-muted-text">
          If you have questions about what is in your Open Box or when shipping will be ready,
          contact support.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
            data-testid="open-box-support-dashboard"
          >
            Back to dashboard
          </Link>
          <Link
            href={openBoxSupportHref}
            className="mk-cta inline-flex rounded-2xl px-4 py-2 text-sm font-semibold"
            data-testid="open-box-support-link"
          >
            Contact support
          </Link>
        </div>
      </section>
    </div>
  )
}