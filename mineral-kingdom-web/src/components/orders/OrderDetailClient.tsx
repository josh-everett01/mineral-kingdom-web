"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type Props = {
  orderId: string
}

type OrderLineDto = {
  id?: string
  listingId?: string
  quantity?: number
  unitFinalPriceCents?: number
  lineTotalCents?: number
}

type OrderDto = {
  id?: string
  userId?: string | null
  orderNumber?: string | null
  sourceType?: string | null
  auctionId?: string | null
  paymentDueAt?: string | null
  subtotalCents?: number
  discountTotalCents?: number
  totalCents?: number
  currencyCode?: string | null
  status?: string | null
  paymentStatus?: string | null
  paymentProvider?: string | null
  paidAt?: string | null
  lines?: OrderLineDto[] | null
}

type StartOrderPaymentResponse = {
  orderPaymentId?: string
  provider?: string | null
  status?: string | null
  redirectUrl?: string | null
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
    case "REDIRECTED":
      return "Redirected"
    case "CREATED":
      return "Created"
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

function isAwaitingPayment(order: OrderDto | null) {
  return order?.status === "AWAITING_PAYMENT"
}

function isPaidOrder(order: OrderDto | null) {
  return order?.status === "READY_TO_FULFILL"
}

export function OrderDetailClient({ orderId }: Props) {
  const router = useRouter()

  const [order, setOrder] = useState<OrderDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<"stripe" | "paypal">("stripe")
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadOrder() {
      setIsLoading(true)
      setError(null)
      setSessionExpired(false)

      try {
        const res = await fetch(`/api/bff/orders/${encodeURIComponent(orderId)}`, {
          cache: "no-store",
        })

        const body = (await res.json().catch(() => null)) as
          | OrderDto
          | { message?: string; error?: string }
          | null

        if (!isMounted) return

        if (res.status === 401) {
          setSessionExpired(true)
          setError("Your session expired. Please sign in again.")
          setIsLoading(false)
          return
        }

        if (!res.ok || !body || !("id" in body)) {
          setError(
            (body && "message" in body && typeof body.message === "string" && body.message) ||
            (body && "error" in body && typeof body.error === "string" && body.error) ||
            "We couldn’t load this order.",
          )
          setIsLoading(false)
          return
        }

        setOrder(body)
        setIsLoading(false)
      } catch {
        if (!isMounted) return
        setError("We couldn’t load this order.")
        setIsLoading(false)
      }
    }

    void loadOrder()

    return () => {
      isMounted = false
    }
  }, [orderId])

  async function handleStartPayment() {
    if (!order || !isAwaitingPayment(order) || isSubmittingPayment) return

    setIsSubmittingPayment(true)
    setPaymentError(null)
    setSessionExpired(false)

    try {
      const origin = window.location.origin

      const res = await fetch(
        `/api/bff/orders/${encodeURIComponent(orderId)}/payments/start`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            provider: selectedProvider,
            successUrl: `${origin}/orders/return`,
            cancelUrl: `${origin}/orders/${encodeURIComponent(orderId)}`,
          }),
        },
      )

      const body = (await res.json().catch(() => null)) as
        | StartOrderPaymentResponse
        | { message?: string; error?: string }
        | null

      if (res.status === 401) {
        setSessionExpired(true)
        setPaymentError("Your session expired. Please sign in again.")
        setIsSubmittingPayment(false)
        return
      }

      if (!res.ok || !body || !("redirectUrl" in body)) {
        setPaymentError(
          (body && "message" in body && typeof body.message === "string" && body.message) ||
          (body && "error" in body && typeof body.error === "string" && body.error) ||
          "We couldn’t start payment for this order.",
        )
        setIsSubmittingPayment(false)
        return
      }

      if (!body.redirectUrl) {
        setPaymentError("Payment started, but no redirect URL was returned.")
        setIsSubmittingPayment(false)
        return
      }

      if (!body.orderPaymentId) {
        setPaymentError("Payment started, but no order payment id was returned.")
        setIsSubmittingPayment(false)
        return
      }

      window.sessionStorage.setItem(
        "mk_order_payment_return_payment_id",
        body.orderPaymentId,
      )

      const redirectUrl = new URL(body.redirectUrl)
      redirectUrl.searchParams.set("paymentId", body.orderPaymentId)

      window.location.assign(redirectUrl.toString())
    } catch {
      setPaymentError("We couldn’t start payment for this order.")
      setIsSubmittingPayment(false)
    }
  }

  function goToLogin() {
    const returnTo = encodeURIComponent(`/orders/${orderId}`)
    router.push(`/login?returnTo=${returnTo}`)
  }

  const total = formatMoney(order?.totalCents, order?.currencyCode)
  const subtotal = formatMoney(order?.subtotalCents, order?.currencyCode)
  const discount = formatMoney(order?.discountTotalCents, order?.currencyCode)
  const paymentDueAt = formatDateTime(order?.paymentDueAt)
  const paidAt = formatDateTime(order?.paidAt)
  const paymentStatus = formatPaymentStatus(order?.paymentStatus)
  const paymentProvider = formatPaymentProvider(order?.paymentProvider)

  if (isLoading) {
    return (
      <section
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        data-testid="order-detail-loading"
      >
        <p className="text-sm text-stone-600">Loading order…</p>
      </section>
    )
  }

  if (error && !order) {
    return (
      <section
        className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm"
        data-testid="order-detail-error"
      >
        <h1 className="text-xl font-semibold text-red-900">We couldn’t load this order</h1>
        <p className="mt-2 text-sm text-red-800">{error}</p>

        {sessionExpired ? (
          <button
            type="button"
            onClick={goToLogin}
            className="mt-4 inline-flex rounded-full bg-red-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
            data-testid="order-detail-sign-in-again"
          >
            Sign in again
          </button>
        ) : null}
      </section>
    )
  }

  return (
    <section
      className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      data-testid="order-detail-card"
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">Order</p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          {isAwaitingPayment(order) ? "Complete payment for your order" : "Order details"}
        </h1>
        <p className="text-sm text-stone-600 sm:text-base">
          Auction winners pay from an order-owned flow. This page reflects backend-authoritative
          order and payment state.
        </p>
      </div>

      <dl className="grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
        <div>
          <dt className="font-medium text-stone-500">Order number</dt>
          <dd data-testid="order-detail-number">{order?.orderNumber ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Status</dt>
          <dd data-testid="order-detail-status">{order?.status ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Source</dt>
          <dd data-testid="order-detail-source">{order?.sourceType ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Auction</dt>
          <dd data-testid="order-detail-auction-id">{order?.auctionId ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Payment due</dt>
          <dd data-testid="order-detail-payment-due">{paymentDueAt ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Payment status</dt>
          <dd data-testid="order-detail-payment-status">{paymentStatus}</dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Provider</dt>
          <dd data-testid="order-detail-payment-provider">{paymentProvider}</dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Paid at</dt>
          <dd data-testid="order-detail-paid-at">{paidAt ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Subtotal</dt>
          <dd data-testid="order-detail-subtotal">{subtotal ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Discount</dt>
          <dd data-testid="order-detail-discount">{discount ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Total</dt>
          <dd data-testid="order-detail-total">{total ?? "—"}</dd>
        </div>
      </dl>

      {order?.lines?.length ? (
        <section
          className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
          data-testid="order-detail-lines"
        >
          <h2 className="text-lg font-semibold text-stone-900">Order lines</h2>
          <ul className="mt-3 space-y-3">
            {order.lines.map((line) => (
              <li
                key={line.id ?? `${line.listingId}-${line.quantity}`}
                className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm text-stone-700"
              >
                <div>Listing: {line.listingId ?? "—"}</div>
                <div>Quantity: {line.quantity ?? 0}</div>
                <div>
                  Line total: {formatMoney(line.lineTotalCents, order.currencyCode) ?? "—"}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isAwaitingPayment(order) ? (
        <section
          className="rounded-2xl border border-blue-200 bg-blue-50 p-6"
          data-testid="order-detail-payment-panel"
        >
          <h2 className="text-lg font-semibold text-blue-950">Payment is due</h2>
          <p className="mt-2 text-sm leading-6 text-blue-900">
            Choose a payment provider to complete this auction order.
          </p>

          <fieldset className="mt-4 space-y-2">
            <legend className="block text-sm font-medium text-blue-950">Payment provider</legend>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-blue-950">
                <input
                  type="radio"
                  name="order-payment-provider"
                  value="stripe"
                  checked={selectedProvider === "stripe"}
                  onChange={() => setSelectedProvider("stripe")}
                  data-testid="order-detail-provider-stripe"
                />
                Stripe
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-blue-950">
                <input
                  type="radio"
                  name="order-payment-provider"
                  value="paypal"
                  checked={selectedProvider === "paypal"}
                  onChange={() => setSelectedProvider("paypal")}
                  data-testid="order-detail-provider-paypal"
                />
                PayPal / Venmo
              </label>
            </div>
          </fieldset>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleStartPayment}
              disabled={isSubmittingPayment}
              className="inline-flex rounded-full bg-blue-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="order-detail-start-payment"
            >
              {isSubmittingPayment ? "Starting payment..." : "Pay Now"}
            </button>

            {order?.auctionId ? (
              <Link
                href={`/auctions/${order.auctionId}`}
                className="inline-flex rounded-full border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-950 transition hover:bg-blue-100"
                data-testid="order-detail-back-to-auction"
              >
                Back to auction
              </Link>
            ) : null}
          </div>

          {paymentError ? (
            <div
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              data-testid="order-detail-payment-error"
            >
              {paymentError}
            </div>
          ) : null}

          {sessionExpired ? (
            <button
              type="button"
              onClick={goToLogin}
              className="mt-4 inline-flex rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
              data-testid="order-detail-payment-sign-in-again"
            >
              Sign in again
            </button>
          ) : null}
        </section>
      ) : null}

      {isPaidOrder(order) ? (
        <section
          className="rounded-2xl border border-green-200 bg-green-50 p-6"
          data-testid="order-detail-paid-state"
        >
          <h2 className="text-lg font-semibold text-green-900">Payment complete</h2>
          <p className="mt-2 text-sm leading-6 text-green-800">
            This auction order has been paid successfully and is moving through fulfillment.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {order?.auctionId ? (
              <Link
                href={`/auctions/${order.auctionId}`}
                className="inline-flex rounded-full border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-900 transition hover:bg-green-100"
                data-testid="order-detail-paid-back-to-auction"
              >
                Back to auction
              </Link>
            ) : null}

            <Link
              href="/dashboard"
              className="inline-flex rounded-full bg-green-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800"
              data-testid="order-detail-paid-go-dashboard"
            >
              Go to dashboard
            </Link>
          </div>
        </section>
      ) : null}
    </section>
  )
}