"use client"

import Link from "next/link"
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

function formatOrderStatus(value?: string | null) {
  if (!value) return "—"

  switch (value.toUpperCase()) {
    case "READY_TO_FULFILL":
      return "Ready to fulfill"
    case "PAID":
      return "Paid"
    case "COMPLETED":
      return "Completed"
    case "DELIVERED":
      return "Delivered"
    case "AWAITING_PAYMENT":
      return "Awaiting payment"
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

function DetailItem({
  label,
  value,
  testId,
}: {
  label: string
  value: string
  testId: string
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm text-[color:var(--mk-ink)]" data-testid={testId}>
        {value}
      </dd>
    </div>
  )
}

function OrderConfirmationShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <section className="space-y-5" data-testid="order-confirmation-card">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 mk-muted-text sm:text-base">
          {description}
        </p>
      </section>

      {children}
    </section>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <OrderConfirmationShell
      eyebrow="Order confirmation"
      title="Order not found"
      description="We could not find this order, or it is not available for this session."
    >
      <section className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 shadow-sm">
        <p className="text-sm font-semibold text-[color:var(--mk-danger)]">{message}</p>
        <p className="mt-2 text-sm leading-6 mk-muted-text">
          Check that the order link is correct. If payment just completed, return to your dashboard
          and refresh your orders.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="mk-cta inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold"
          >
            Back to dashboard
          </Link>
          <Link
            href="/support/new?category=ORDER_HELP"
            className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-5 py-2.5 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
          >
            Contact support
          </Link>
        </div>
      </section>
    </OrderConfirmationShell>
  )
}

export function OrderConfirmationClient({ orderId, initialPaymentId }: Props) {
  const router = useRouter()
  const [order, setOrder] = useState<OrderConfirmationDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
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
        setOrder(null)
        setError(
          (body && "message" in body && body.message) ||
          (body && "error" in body && body.error) ||
          "We couldn't load the confirmed order state.",
        )
        setHasLoaded(true)
        return
      }

      setOrder(body)
      setError(null)
      setHasLoaded(true)
    } catch {
      setOrder(null)
      setError("We couldn't load the confirmed order state.")
      setHasLoaded(true)
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

  if (!hasLoaded) {
    return (
      <OrderConfirmationShell
        eyebrow="Order confirmation"
        title="Loading confirmed order state"
        description="We are checking the backend-confirmed order status. Provider redirects are never treated as proof of payment."
      >
        <section className="rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-5 text-sm mk-muted-text shadow-sm">
          Loading order confirmation…
        </section>
      </OrderConfirmationShell>
    )
  }

  if (error && !order) {
    return <ErrorState message={error} />
  }

  const total = formatMoney(order?.totalCents, order?.currencyCode)
  const paidAt = formatDateTime(order?.paidAt)

  return (
    <OrderConfirmationShell
      eyebrow="Order confirmation"
      title="Your order status is backend-confirmed"
      description="This page reflects trusted order state from the backend. It never treats provider redirect data as proof that payment succeeded."
    >
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <DetailItem
          label="Order number"
          value={order?.orderNumber ?? "—"}
          testId="order-confirmation-number"
        />
        <DetailItem
          label="Status"
          value={formatOrderStatus(order?.status)}
          testId="order-confirmation-status"
        />
        <DetailItem
          label="Payment status"
          value={formatPaymentStatus(order?.paymentStatus)}
          testId="order-confirmation-payment-status"
        />
        <DetailItem
          label="Provider"
          value={formatPaymentProvider(order?.paymentProvider ?? order?.provider)}
          testId="order-confirmation-provider"
        />
        <DetailItem
          label="Paid at"
          value={paidAt ?? "—"}
          testId="order-confirmation-paid-at"
        />
        <DetailItem
          label="Total"
          value={total ?? "—"}
          testId="order-confirmation-total"
        />
        <DetailItem
          label="Guest email"
          value={order?.guestEmail ?? "—"}
          testId="order-confirmation-guest-email"
        />
      </dl>

      {error ? (
        <section className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-4 text-sm text-[color:var(--mk-danger)]">
          {error}
        </section>
      ) : null}
    </OrderConfirmationShell>
  )
}