"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSse } from "@/lib/sse/useSse"

type Props = {
  orderId: string
  initialPaymentId?: string | null
}

type OrderConfirmationDto = {
  id: string
  orderNumber?: string | null
  status?: string | null
  totalCents?: number | null
  currencyCode?: string | null
  paymentStatus?: string | null
  paymentProvider?: string | null
  provider?: string | null
  paidAt?: string | null
  guestEmail?: string | null
  isConfirmed?: boolean
}

function formatMoney(cents?: number | null, currencyCode?: string | null) {
  if (cents == null) return null

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode ?? "USD",
  }).format(cents / 100)
}

function formatDateTime(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function formatPaymentStatus(value?: string | null) {
  if (!value) return "—"

  switch (value.toUpperCase()) {
    case "SUCCEEDED":
      return "Paid"
    case "PENDING":
      return "Pending"
    case "FAILED":
      return "Failed"
    default:
      return value
  }
}

function formatPaymentProvider(value?: string | null) {
  if (!value) return "—"

  switch (value.toUpperCase()) {
    case "STRIPE":
      return "Stripe"
    case "PAYPAL":
      return "PayPal"
    default:
      return value
  }
}

function isConfirmedOrder(order: OrderConfirmationDto | null) {
  if (!order) return false

  return (
    order.status === "READY_TO_FULFILL" ||
    order.paymentStatus === "SUCCEEDED" ||
    order.isConfirmed === true
  )
}

export function OrderConfirmationClient({ orderId, initialPaymentId }: Props) {
  const router = useRouter()
  const [order, setOrder] = useState<OrderConfirmationDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paymentId] = useState<string | null>(() => {
    if (initialPaymentId) return initialPaymentId
    if (typeof window === "undefined") return null
    return window.sessionStorage.getItem(`mk_order_payment_${orderId}`)
  })

  const hasReconciledCartRef = useRef(false)
  const lastReloadAtRef = useRef<number>(0)

  const shouldListenToSse = !isConfirmedOrder(order)
  const sseUrl = useMemo(
    () => (shouldListenToSse ? `/api/bff/sse/orders/${orderId}` : null),
    [orderId, shouldListenToSse],
  )

  const { lastEventAt } = useSse(sseUrl)

  const loadOrder = useCallback(async () => {
    try {
      const suffix = paymentId ? `?paymentId=${encodeURIComponent(paymentId)}` : ""
      const res = await fetch(`/api/bff/orders/${orderId}${suffix}`, {
        cache: "no-store",
      })

      const body = (await res.json().catch(() => null)) as
        | OrderConfirmationDto
        | { message?: string; error?: string }
        | null

      if (!res.ok || !body || !("id" in body)) {
        setError(
          (body && "message" in body && body.message) ||
          (body && "error" in body && body.error) ||
          "We couldn't load the confirmed order state.",
        )
        return
      }

      setOrder(body)
      setError(null)
    } catch {
      setError("We couldn't load the confirmed order state.")
    }
  }, [orderId, paymentId])

  useEffect(() => {
    void loadOrder()
  }, [loadOrder])

  useEffect(() => {
    if (!lastEventAt) return
    if (isConfirmedOrder(order)) return

    const now = Date.now()
    const minReloadGapMs = 2000

    if (now - lastReloadAtRef.current < minReloadGapMs) {
      return
    }

    lastReloadAtRef.current = now
    void loadOrder()
  }, [lastEventAt, loadOrder, order])

  useEffect(() => {
    if (!order?.id || hasReconciledCartRef.current) return
    if (!isConfirmedOrder(order)) return

    hasReconciledCartRef.current = true

    void (async () => {
      try {
        await fetch("/api/bff/cart", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        })
      } catch {
        // best-effort only
      } finally {
        router.refresh()
      }
    })()
  }, [order, router])

  const total = formatMoney(order?.totalCents, order?.currencyCode)
  const paidAt = formatDateTime(order?.paidAt)

  return (
    <section
      className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      data-testid="order-confirmation-card"
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Order confirmation
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Your order status is backend-confirmed
        </h1>
        <p className="text-sm text-stone-600 sm:text-base">
          This page reflects trusted order state from the backend. It never treats provider redirect
          data as proof that payment succeeded.
        </p>
      </div>

      <dl className="grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
        <div>
          <dt className="font-medium text-stone-500">Order number</dt>
          <dd data-testid="order-confirmation-number">{order?.orderNumber ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Status</dt>
          <dd data-testid="order-confirmation-status">{order?.status ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Payment status</dt>
          <dd data-testid="order-confirmation-payment-status">
            {formatPaymentStatus(order?.paymentStatus)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Provider</dt>
          <dd data-testid="order-confirmation-provider">
            {formatPaymentProvider(order?.paymentProvider ?? order?.provider)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Paid at</dt>
          <dd data-testid="order-confirmation-paid-at">{paidAt ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Total</dt>
          <dd data-testid="order-confirmation-total">{total ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Guest email</dt>
          <dd data-testid="order-confirmation-guest-email">{order?.guestEmail ?? "—"}</dd>
        </div>
      </dl>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}
    </section>
  )
}