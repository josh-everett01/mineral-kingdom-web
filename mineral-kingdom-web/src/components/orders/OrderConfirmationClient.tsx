"use client"

import { useEffect, useState } from "react"

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
  provider?: string | null
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

export function OrderConfirmationClient({ orderId, initialPaymentId }: Props) {
  const [order, setOrder] = useState<OrderConfirmationDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paymentId] = useState<string | null>(() => {
    if (initialPaymentId) return initialPaymentId
    if (typeof window === "undefined") return null
    return window.sessionStorage.getItem(`mk_order_payment_${orderId}`)
  })

  useEffect(() => {
    let cancelled = false
    let intervalId: number | null = null

    async function poll() {
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
          if (!cancelled) {
            setError(
              (body && "message" in body && body.message) ||
              (body && "error" in body && body.error) ||
              "We couldn't load the confirmed order state.",
            )
          }
          return
        }

        if (!cancelled) {
          setOrder(body)
          setError(null)
        }
      } catch {
        if (!cancelled) {
          setError("We couldn't load the confirmed order state.")
        }
      }
    }

    void poll()
    intervalId = window.setInterval(() => {
      void poll()
    }, 4000)

    return () => {
      cancelled = true
      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }
    }
  }, [orderId, paymentId])

  const total = formatMoney(order?.totalCents, order?.currencyCode)

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
          <dt className="font-medium">Order ID</dt>
          <dd data-testid="order-confirmation-order-id">{orderId}</dd>
        </div>
        <div>
          <dt className="font-medium">Order number</dt>
          <dd data-testid="order-confirmation-order-number">
            {order?.orderNumber ?? "Waiting…"}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Order status</dt>
          <dd data-testid="order-confirmation-order-status">{order?.status ?? "Waiting…"}</dd>
        </div>
        <div>
          <dt className="font-medium">Payment status</dt>
          <dd data-testid="order-confirmation-payment-status">
            {order?.paymentStatus ?? "Waiting…"}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Provider</dt>
          <dd data-testid="order-confirmation-provider">{order?.provider ?? "Waiting…"}</dd>
        </div>
        <div>
          <dt className="font-medium">Total</dt>
          <dd data-testid="order-confirmation-total">{total ?? "Waiting…"}</dd>
        </div>
      </dl>

      {order?.guestEmail ? (
        <p className="text-sm text-stone-600" data-testid="order-confirmation-guest-email">
          Guest checkout email: {order.guestEmail}
        </p>
      ) : null}

      {error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          data-testid="order-confirmation-error"
        >
          {error}
        </div>
      ) : null}
    </section>
  )
}