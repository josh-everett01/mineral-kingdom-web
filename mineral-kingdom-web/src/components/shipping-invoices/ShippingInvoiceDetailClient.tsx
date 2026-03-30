"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSse } from "@/lib/sse/useSse"

type Props = {
  invoiceId: string
}

type ShippingInvoiceDetailDto = {
  shippingInvoiceId?: string
  fulfillmentGroupId?: string | null
  amountCents?: number
  currencyCode?: string | null
  status?: string | null
  paidAt?: string | null
  provider?: string | null
  providerCheckoutId?: string | null
}

type StartShippingInvoicePaymentResponse = {
  shippingInvoicePaymentId?: string
  provider?: string | null
  status?: string | null
  redirectUrl?: string | null
}

type ShippingInvoiceRealtimeSnapshot = {
  shippingInvoiceId?: string
  fulfillmentGroupId?: string | null
  amountCents?: number
  currencyCode?: string | null
  status?: string | null
  paidAt?: string | null
  provider?: string | null
  updatedAt?: string | null
}

type LoadableError = {
  status?: number
  message?: string
  error?: string
  code?: string
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
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function formatInvoiceStatus(value?: string | null) {
  if (!value) return "—"

  switch (value.toUpperCase()) {
    case "UNPAID":
      return "Unpaid"
    case "PAID":
      return "Paid"
    default:
      return value.replaceAll("_", " ")
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

function isPaidInvoice(invoice: ShippingInvoiceDetailDto | null) {
  return invoice?.status?.toUpperCase() === "PAID"
}

function normalizeSseSnapshot(payload: unknown): ShippingInvoiceRealtimeSnapshot {
  const source = (payload ?? {}) as Record<string, unknown>

  return {
    shippingInvoiceId:
      typeof source.ShippingInvoiceId === "string" ? source.ShippingInvoiceId : undefined,
    fulfillmentGroupId:
      typeof source.FulfillmentGroupId === "string" || source.FulfillmentGroupId === null
        ? (source.FulfillmentGroupId as string | null)
        : undefined,
    amountCents: typeof source.AmountCents === "number" ? source.AmountCents : undefined,
    currencyCode: typeof source.CurrencyCode === "string" ? source.CurrencyCode : undefined,
    status: typeof source.Status === "string" ? source.Status : undefined,
    paidAt:
      typeof source.PaidAt === "string" || source.PaidAt === null
        ? (source.PaidAt as string | null)
        : undefined,
    provider: typeof source.Provider === "string" ? source.Provider : undefined,
    updatedAt:
      typeof source.UpdatedAt === "string" || source.UpdatedAt === null
        ? (source.UpdatedAt as string | null)
        : undefined,
  }
}

export function ShippingInvoiceDetailClient({ invoiceId }: Props) {
  const router = useRouter()

  const [invoice, setInvoice] = useState<ShippingInvoiceDetailDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  const [selectedProvider, setSelectedProvider] = useState<"stripe" | "paypal">("stripe")
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const sse = useSse<ShippingInvoiceRealtimeSnapshot>(
    invoice ? `/api/bff/sse/shipping-invoices/${encodeURIComponent(invoiceId)}` : null,
    {
      parseSnapshot: (data) => normalizeSseSnapshot(JSON.parse(data) as unknown),
    },
  )

  useEffect(() => {
    let isMounted = true

    async function loadInvoice() {
      setIsLoading(true)
      setError(null)
      setErrorStatus(null)
      setSessionExpired(false)

      try {
        const res = await fetch(`/api/bff/shipping-invoices/${encodeURIComponent(invoiceId)}`, {
          cache: "no-store",
        })

        const body = (await res.json().catch(() => null)) as
          | ShippingInvoiceDetailDto
          | LoadableError
          | null

        if (!isMounted) return

        if (res.status === 401) {
          setSessionExpired(true)
          setErrorStatus(401)
          setError("Your session expired. Please sign in again.")
          setIsLoading(false)
          return
        }

        if (res.status === 404) {
          setErrorStatus(404)
          setError("We couldn’t find this shipping invoice.")
          setIsLoading(false)
          return
        }

        if (!res.ok || !body || !("shippingInvoiceId" in body)) {
          setErrorStatus(res.status)
          setError(
            (body && "message" in body && typeof body.message === "string" && body.message) ||
            (body && "error" in body && typeof body.error === "string" && body.error) ||
            "We couldn’t load this shipping invoice.",
          )
          setIsLoading(false)
          return
        }

        setInvoice(body)
        setIsLoading(false)
      } catch {
        if (!isMounted) return
        setErrorStatus(500)
        setError("We couldn’t load this shipping invoice.")
        setIsLoading(false)
      }
    }

    void loadInvoice()

    return () => {
      isMounted = false
    }
  }, [invoiceId])

  const liveInvoice = useMemo(() => {
    if (!invoice) return null

    const snapshot = sse.snapshot
    if (!snapshot) return invoice

    return {
      ...invoice,
      shippingInvoiceId: snapshot.shippingInvoiceId ?? invoice.shippingInvoiceId,
      fulfillmentGroupId:
        snapshot.fulfillmentGroupId !== undefined
          ? snapshot.fulfillmentGroupId
          : invoice.fulfillmentGroupId,
      amountCents: snapshot.amountCents ?? invoice.amountCents,
      currencyCode: snapshot.currencyCode ?? invoice.currencyCode,
      status: snapshot.status ?? invoice.status,
      paidAt: snapshot.paidAt ?? invoice.paidAt,
      provider: snapshot.provider ?? invoice.provider,
    }
  }, [invoice, sse.snapshot])

  async function handleStartPayment() {
    if (!liveInvoice || isSubmittingPayment || isPaidInvoice(liveInvoice)) return

    setIsSubmittingPayment(true)
    setPaymentError(null)
    setSessionExpired(false)

    try {
      const origin = window.location.origin

      const res = await fetch(
        `/api/bff/shipping-invoices/${encodeURIComponent(invoiceId)}/pay`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            provider: selectedProvider,
            successUrl: `${origin}/shipping-invoices/${encodeURIComponent(invoiceId)}`,
            cancelUrl: `${origin}/shipping-invoices/${encodeURIComponent(invoiceId)}`,
          }),
        },
      )

      const body = (await res.json().catch(() => null)) as
        | StartShippingInvoicePaymentResponse
        | { message?: string; error?: string }
        | null

      if (res.status === 401) {
        setSessionExpired(true)
        setPaymentError("Your session expired. Please sign in again.")
        setIsSubmittingPayment(false)
        return
      }

      if (!res.ok || !body || !("redirectUrl" in body) || !body.redirectUrl) {
        setPaymentError(
          (body && "message" in body && typeof body.message === "string" && body.message) ||
          (body && "error" in body && typeof body.error === "string" && body.error) ||
          "We couldn’t start shipping payment.",
        )
        setIsSubmittingPayment(false)
        return
      }

      if (body.shippingInvoicePaymentId) {
        window.sessionStorage.setItem(
          "mk_shipping_invoice_payment_return_payment_id",
          body.shippingInvoicePaymentId,
        )
      }

      window.location.assign(body.redirectUrl)
    } catch {
      setPaymentError("We couldn’t start shipping payment.")
      setIsSubmittingPayment(false)
    }
  }

  function goToLogin() {
    const returnTo = encodeURIComponent(`/shipping-invoices/${invoiceId}`)
    router.push(`/login?returnTo=${returnTo}`)
  }

  const amount = formatMoney(liveInvoice?.amountCents, liveInvoice?.currencyCode)
  const paidAt = formatDateTime(liveInvoice?.paidAt)
  const provider = formatPaymentProvider(liveInvoice?.provider)
  const invoiceStatus = formatInvoiceStatus(liveInvoice?.status)

  if (isLoading) {
    return (
      <section
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        data-testid="shipping-invoice-detail-loading"
      >
        <p className="text-sm text-stone-600">Loading shipping invoice…</p>
      </section>
    )
  }

  if (error && !liveInvoice) {
    return (
      <section
        className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm"
        data-testid="shipping-invoice-detail-error"
      >
        <h1 className="text-xl font-semibold text-red-900">
          {errorStatus === 404 ? "Shipping invoice not found" : "We couldn’t load this shipping invoice"}
        </h1>
        <p className="mt-2 text-sm text-red-800">{error}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          {sessionExpired || errorStatus === 401 ? (
            <button
              type="button"
              onClick={goToLogin}
              className="inline-flex rounded-full bg-red-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
              data-testid="shipping-invoice-detail-sign-in-again"
            >
              Sign in again
            </button>
          ) : null}

          <Link
            href="/dashboard"
            className="inline-flex rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 transition hover:bg-red-100"
            data-testid="shipping-invoice-detail-back-dashboard"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section
      className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      data-testid="shipping-invoice-detail-card"
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Open Box shipping invoice
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">
              {isPaidInvoice(liveInvoice) ? "Shipping invoice paid" : "Pay shipping for your Open Box"}
            </h1>
            <p className="mt-2 text-sm text-stone-600 sm:text-base">
              This invoice covers shipping for your closed Open Box shipment. Item payments are
              separate and already handled through their original order flows.
            </p>
          </div>

          <div
            className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700"
            data-testid="shipping-invoice-detail-live-status"
          >
            {sse.connected
              ? "Live updates active"
              : sse.connecting
                ? "Reconnecting to live updates…"
                : sse.error
                  ? "Live updates unavailable"
                  : "Waiting for live updates…"}
          </div>
        </div>

        {sse.error ? (
          <p
            className="text-xs text-amber-700"
            data-testid="shipping-invoice-detail-live-status-message"
          >
            Showing the last known invoice state. You can refresh the page if needed.
          </p>
        ) : null}
      </div>

      <section
        className="grid gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="shipping-invoice-detail-summary"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Invoice id</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="shipping-invoice-detail-id">
            {liveInvoice?.shippingInvoiceId ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Status</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="shipping-invoice-detail-status">
            {invoiceStatus}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Amount due</p>
          <p
            className="mt-1 text-sm font-semibold text-stone-900"
            data-testid="shipping-invoice-detail-amount"
          >
            {amount ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Fulfillment group
          </p>
          <p
            className="mt-1 text-sm text-stone-900"
            data-testid="shipping-invoice-detail-fulfillment-group"
          >
            {liveInvoice?.fulfillmentGroupId ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Provider</p>
          <p
            className="mt-1 text-sm text-stone-900"
            data-testid="shipping-invoice-detail-provider"
          >
            {provider}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Paid at</p>
          <p
            className="mt-1 text-sm text-stone-900"
            data-testid="shipping-invoice-detail-paid-at"
          >
            {paidAt ?? "—"}
          </p>
        </div>
      </section>

      <section
        className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
        data-testid="shipping-invoice-detail-context"
      >
        <h2 className="text-lg font-semibold text-stone-900">Why this invoice exists</h2>
        <p className="mt-2 text-sm leading-6 text-stone-700">
          You chose Open Box / combined shipping for one or more previously paid items. This invoice
          collects the shipping amount once your Open Box shipment is ready to close and send.
        </p>
      </section>

      {!isPaidInvoice(liveInvoice) ? (
        <section
          className="rounded-2xl border border-blue-200 bg-blue-50 p-6"
          data-testid="shipping-invoice-detail-payment-panel"
        >
          <h2 className="text-lg font-semibold text-blue-950">Pay shipping</h2>
          <p className="mt-2 text-sm leading-6 text-blue-900">
            Choose a payment provider to pay this shipping invoice. Payment is only considered
            complete when the backend confirms it.
          </p>

          <fieldset className="mt-4 space-y-2">
            <legend className="block text-sm font-medium text-blue-950">Payment provider</legend>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-blue-950">
                <input
                  type="radio"
                  name="shipping-invoice-payment-provider"
                  value="stripe"
                  checked={selectedProvider === "stripe"}
                  onChange={() => setSelectedProvider("stripe")}
                  data-testid="shipping-invoice-detail-provider-stripe"
                />
                Stripe
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-blue-950">
                <input
                  type="radio"
                  name="shipping-invoice-payment-provider"
                  value="paypal"
                  checked={selectedProvider === "paypal"}
                  onChange={() => setSelectedProvider("paypal")}
                  data-testid="shipping-invoice-detail-provider-paypal"
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
              data-testid="shipping-invoice-detail-start-payment"
            >
              {isSubmittingPayment ? "Starting payment..." : "Pay shipping"}
            </button>
          </div>

          {paymentError ? (
            <div
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              data-testid="shipping-invoice-detail-payment-error"
            >
              {paymentError}
            </div>
          ) : null}

          {sessionExpired ? (
            <button
              type="button"
              onClick={goToLogin}
              className="mt-4 inline-flex rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
              data-testid="shipping-invoice-detail-payment-sign-in-again"
            >
              Sign in again
            </button>
          ) : null}
        </section>
      ) : (
        <section
          className="rounded-2xl border border-green-200 bg-green-50 p-6"
          data-testid="shipping-invoice-detail-paid-state"
        >
          <h2 className="text-lg font-semibold text-green-900">Shipping payment complete</h2>
          <p className="mt-2 text-sm leading-6 text-green-800">
            Shipping payment has been confirmed for this Open Box invoice.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex rounded-full bg-green-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800"
              data-testid="shipping-invoice-detail-paid-go-dashboard"
            >
              Go to dashboard
            </Link>
          </div>
        </section>
      )}

      <section
        className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
        data-testid="shipping-invoice-detail-support"
      >
        <h2 className="text-lg font-semibold text-stone-900">Need help?</h2>
        <p className="mt-2 text-sm text-stone-600">
          If something looks wrong with this invoice or payment state, contact support and include
          the shipping invoice id.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
            data-testid="shipping-invoice-detail-support-dashboard"
          >
            Back to dashboard
          </Link>
          <Link
            href="/support"
            className="inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
            data-testid="shipping-invoice-detail-support-link"
          >
            Contact support
          </Link>
        </div>
      </section>
    </section>
  )
}