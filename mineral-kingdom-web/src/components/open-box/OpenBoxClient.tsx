"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
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

  if (boxStatus === "OPEN" || boxStatus === "CLOSED" || boxStatus === "SHIPPED") {
    return boxStatus
  }

  if (fulfillmentStatus === "SHIPPED") return "SHIPPED"

  return "OPEN"
}

function statusToneClasses(status: string) {
  switch (status) {
    case "OPEN":
      return "border-blue-200 bg-blue-50 text-blue-950"
    case "CLOSED":
      return "border-amber-200 bg-amber-50 text-amber-950"
    case "SHIPPED":
      return "border-green-200 bg-green-50 text-green-950"
    default:
      return "border-stone-200 bg-stone-50 text-stone-900"
  }
}

function statusTitle(status: string) {
  switch (status) {
    case "OPEN":
      return "Your Open Box is active"
    case "CLOSED":
      return "Your Open Box has been closed"
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
  return status === "CLOSED" || status === "SHIPPED"
}

function OrderRow({ order }: { order: OpenBoxOrderItemDto }) {
  return (
    <li
      className="flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-4"
      data-testid="open-box-order-row"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
        <span className="px-2 text-center text-[11px] font-medium text-stone-500">Order</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-stone-900">{order.orderNumber}</p>
        <p className="mt-1 text-sm text-stone-600">Status: {order.status}</p>
        <p className="mt-1 text-sm text-stone-700">
          {formatMoney(order.totalCents, order.currencyCode)}
        </p>
      </div>
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
  const invoiceStatus = normalizeInvoiceStatus(invoice?.status)
  const showInvoiceForCurrentBox = shouldShowInvoiceForOpenBox(openBoxStatus)
  const visibleInvoice = showInvoiceForCurrentBox ? invoice : null
  const hasInvoice = visibleInvoice != null
  const isInvoicePayable = invoiceStatus === "UNPAID"
  const isInvoicePaid = invoiceStatus === "PAID"
  const canRequestShipment = openBoxStatus === "OPEN" && (openBox?.orderCount ?? 0) > 0

  async function handleCloseBox() {
    setCloseError(null)
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

      await load()
    } catch {
      setCloseError("We couldn’t request shipment for this Open Box right now.")
    } finally {
      setIsClosingBox(false)
    }
  }

  if (isLoading) {
    return (
      <section
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        data-testid="open-box-loading"
      >
        <p className="text-sm text-stone-600">Loading Open Box…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section
        className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm"
        data-testid="open-box-error"
      >
        <h1 className="text-2xl font-semibold text-red-900">We couldn’t load your Open Box</h1>
        <p className="mt-2 text-sm text-red-800">{error}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          {sessionExpired || errorStatus === 401 ? (
            <Link
              href="/login?returnTo=%2Fopen-box"
              className="inline-flex rounded-full bg-red-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
              data-testid="open-box-sign-in-again"
            >
              Sign in again
            </Link>
          ) : null}

          <Link
            href="/dashboard"
            className="inline-flex rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 transition hover:bg-red-100"
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
      <section
        className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        data-testid="open-box-empty"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">Open Box</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
            You do not have an Open Box yet
          </h1>
          <p className="mt-2 text-sm text-stone-600 sm:text-base">
            Open Box lets you combine eligible purchases into one shipment. When you keep an item in
            Open Box, it will appear here.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
            data-testid="open-box-empty-dashboard"
          >
            Back to dashboard
          </Link>
          <Link
            href="/shop"
            className="inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
            data-testid="open-box-empty-shop"
          >
            Browse shop
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section
      className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      data-testid="open-box-page"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">Open Box</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
          Combined shipping made simple
        </h1>
        <p className="mt-2 text-sm text-stone-600 sm:text-base">
          Open Box lets you combine eligible purchases into one shipment. This page shows what is
          currently grouped together and what the next step is.
        </p>
      </div>

      <section
        className={`rounded-2xl border p-5 shadow-sm ${toneClasses}`}
        data-testid="open-box-status-card"
      >
        <p className="text-xs font-semibold uppercase tracking-wide">Status</p>
        <h2 className="mt-2 text-xl font-semibold" data-testid="open-box-status">
          {openBoxStatus}
        </h2>
        <p className="mt-2 text-sm font-medium">{statusTitle(openBoxStatus)}</p>
        <p className="mt-2 text-sm opacity-90">{statusDescription(openBoxStatus, hasInvoice)}</p>
        {openBox.closedAt ? (
          <p className="mt-3 text-xs opacity-80">
            Closed {formatDate(openBox.closedAt) ?? "recently"}
          </p>
        ) : null}
      </section>

      <section
        className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
        data-testid="open-box-items"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-900">Orders in your Open Box</h2>
          <p className="text-sm text-stone-500">
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
          <p className="mt-4 text-sm text-stone-600" data-testid="open-box-items-empty">
            Your Open Box exists, but orders are not visible yet.
          </p>
        )}
      </section>

      {canRequestShipment ? (
        <section
          className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
          data-testid="open-box-request-shipment"
        >
          <h2 className="text-lg font-semibold text-stone-900">Ready to ship these items?</h2>
          <p className="mt-2 text-sm text-stone-600">
            This will close your current Open Box and prepare shipping for the items shown here.
            Shipping will be billed after your box is closed.
          </p>

          {closeError ? (
            <div
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
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
              className="inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="open-box-close-button"
            >
              {isClosingBox ? "Preparing shipment…" : "Ship all items now"}
            </button>
          </div>
        </section>
      ) : null}

      <section
        className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
        data-testid="open-box-invoice-section"
      >
        <h2 className="text-lg font-semibold text-stone-900">Shipping invoice</h2>

        {!showInvoiceForCurrentBox ? (
          <p className="mt-2 text-sm text-stone-600" data-testid="open-box-no-invoice">
            Shipping will be billed once your Open Box is closed.
          </p>
        ) : visibleInvoice ? (
          <>
            <p className="mt-2 text-sm text-stone-600">
              {isInvoicePayable
                ? "Your Open Box shipping invoice is ready."
                : isInvoicePaid
                  ? "Shipping has already been paid for this closed Open Box shipment."
                  : "Your Open Box shipping invoice is available."}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-stone-900">
                  {formatMoney(visibleInvoice.amountCents, visibleInvoice.currencyCode)}
                </p>
                <p className="mt-1 text-sm text-stone-600">Status: {visibleInvoice.status}</p>
              </div>

              <Link
                href={`/shipping-invoices/${visibleInvoice.shippingInvoiceId}`}
                className="inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
                data-testid="open-box-pay-shipping"
              >
                {isInvoicePayable ? "Pay shipping" : "View invoice"}
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-stone-600" data-testid="open-box-no-invoice">
            {openBoxStatus === "CLOSED"
              ? "Your shipment is being finalized. A shipping invoice will appear here when ready."
              : openBoxStatus === "SHIPPED"
                ? "Shipping payment is no longer needed for this Open Box shipment."
                : "Shipping will be billed once your Open Box is closed."}
          </p>
        )}
      </section>

      <section
        className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
        data-testid="open-box-support"
      >
        <h2 className="text-lg font-semibold text-stone-900">Need help?</h2>
        <p className="mt-2 text-sm text-stone-600">
          If you have questions about what is in your Open Box or when shipping will be ready,
          contact support.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
            data-testid="open-box-support-dashboard"
          >
            Back to dashboard
          </Link>
          <Link
            href="/support"
            className="inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
            data-testid="open-box-support-link"
          >
            Contact support
          </Link>
        </div>
      </section>
    </section>
  )
}