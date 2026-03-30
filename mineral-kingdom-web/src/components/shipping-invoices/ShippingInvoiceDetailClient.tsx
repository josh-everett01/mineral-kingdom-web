"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { PaymentContextRow } from "@/components/payments/PaymentContextRow"
import { PaymentStatusPanel } from "@/components/payments/PaymentStatusPanel"
import { useSse } from "@/lib/sse/useSse"

type Props = {
  invoiceId: string
}

type ShippingInvoiceRelatedOrderDto = {
  orderId?: string
  orderNumber?: string | null
  sourceType?: string | null
}

type ShippingInvoiceItemDto = {
  orderId?: string | null
  orderNumber?: string | null
  sourceType?: string | null
  listingId?: string | null
  listingSlug?: string | null
  title?: string | null
  primaryImageUrl?: string | null
  mineralName?: string | null
  locality?: string | null
  quantity?: number
}

type ShippingInvoiceDto = {
  shippingInvoiceId?: string
  fulfillmentGroupId?: string | null
  amountCents?: number
  currencyCode?: string | null
  status?: string | null
  provider?: string | null
  providerCheckoutId?: string | null
  paidAt?: string | null
  dueAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  itemCount?: number
  previewTitle?: string | null
  previewImageUrl?: string | null
  auctionOrderCount?: number
  storeOrderCount?: number
  relatedOrders?: ShippingInvoiceRelatedOrderDto[] | null
  items?: ShippingInvoiceItemDto[] | null
}

type StartShippingPaymentResponse = {
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

function formatDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

function formatStatus(value?: string | null) {
  if (!value) return "—"

  switch (value.toUpperCase()) {
    case "UNPAID":
      return "Unpaid"
    case "PAID":
      return "Paid"
    case "PENDING":
      return "Pending"
    default:
      return value.replaceAll("_", " ")
  }
}

function formatProvider(value?: string | null) {
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

function formatSourceType(value?: string | null) {
  if (!value) return "Order"

  switch (value.toUpperCase()) {
    case "AUCTION":
      return "Auction"
    case "STORE":
      return "Store"
    default:
      return value
  }
}

function normalizeStatus(value?: string | null) {
  return (value ?? "").trim().toUpperCase()
}

function isUnpaid(invoice: ShippingInvoiceDto | null) {
  return normalizeStatus(invoice?.status) !== "PAID"
}

function buildShippingTitle(invoice: ShippingInvoiceDto | null) {
  if (!invoice) return "Shipping invoice"

  const title = invoice.previewTitle?.trim()
  const itemCount = invoice.itemCount ?? 0

  if (title && itemCount > 1) {
    return `${title} + ${itemCount - 1} more`
  }

  if (title) return title

  if (invoice.relatedOrders?.length === 1 && invoice.relatedOrders[0]?.orderNumber) {
    return `Order ${invoice.relatedOrders[0].orderNumber}`
  }

  if (itemCount > 1) return `${itemCount} items`
  if (itemCount === 1) return "1 item"

  return "Open Box shipment"
}

function buildShippingContext(invoice: ShippingInvoiceDto | null) {
  if (!invoice) return "Shipping invoice • Open Box"

  const firstOrder = invoice.relatedOrders?.[0]

  if (invoice.relatedOrders?.length === 1 && firstOrder?.orderNumber) {
    return `Shipping invoice • Open Box • Order ${firstOrder.orderNumber}`
  }

  if ((invoice.relatedOrders?.length ?? 0) > 1 && firstOrder?.orderNumber) {
    return `Shipping invoice • Open Box • Order ${firstOrder.orderNumber} + ${invoice.relatedOrders!.length - 1} more`
  }

  return "Shipping invoice • Open Box"
}

function buildShippingHelper(invoice: ShippingInvoiceDto | null) {
  if (!invoice) return "Shipping payment only"

  const parts = ["Shipping payment only"]

  if (invoice.dueAt) {
    const due = formatDate(invoice.dueAt)
    if (due) parts.push(`Due ${due}`)
  }

  return parts.join(" • ")
}

function listingHref(item: ShippingInvoiceItemDto) {
  if (!item.listingId) return null
  if (item.listingSlug) return `/listing/${item.listingSlug}-${item.listingId}`
  return `/listing/${item.listingId}`
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

function CoveredItemRow({
  item,
}: {
  item: ShippingInvoiceItemDto
}) {
  const href = listingHref(item)

  return (
    <li
      className="rounded-xl border border-stone-200 bg-white p-4"
      data-testid="shipping-invoice-detail-item-row"
    >
      <div className="flex gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
          {item.primaryImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.primaryImageUrl}
              alt={item.title ?? "Shipping invoice item"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-xs text-stone-500"
              data-testid="shipping-invoice-detail-item-no-image"
            >
              No image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {href ? (
            <Link href={href} className="text-sm font-semibold text-stone-900 hover:underline">
              {item.title ?? "Listing"}
            </Link>
          ) : (
            <p className="text-sm font-semibold text-stone-900">{item.title ?? "Listing"}</p>
          )}

          <p className="mt-1 text-sm text-stone-600">
            {item.orderNumber ? `Order ${item.orderNumber}` : "Order"} • {formatSourceType(item.sourceType)}
          </p>

          {item.mineralName || item.locality ? (
            <p className="mt-1 text-sm text-stone-600">
              {[item.mineralName, item.locality].filter(Boolean).join(" • ")}
            </p>
          ) : null}

          <p className="mt-1 text-sm text-stone-700">Quantity: {item.quantity ?? 1}</p>
        </div>
      </div>
    </li>
  )
}

export function ShippingInvoiceDetailClient({ invoiceId }: Props) {
  const router = useRouter()

  const [invoice, setInvoice] = useState<ShippingInvoiceDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<"stripe" | "paypal">("stripe")
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

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

        const body = (await res.json().catch(() => null)) as ShippingInvoiceDto | LoadableError | null

        if (!isMounted) return

        if (res.status === 401) {
          setSessionExpired(true)
          setErrorStatus(401)
          setError("Your session expired. Please sign in again.")
          setIsLoading(false)
          return
        }

        if (res.status === 403) {
          setErrorStatus(403)
          setError("You do not have access to this shipping invoice.")
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
    if (!sse.snapshot) return invoice

    return {
      ...invoice,
      status: sse.snapshot.status ?? invoice.status,
      amountCents: sse.snapshot.amountCents ?? invoice.amountCents,
      currencyCode: sse.snapshot.currencyCode ?? invoice.currencyCode,
      paidAt: sse.snapshot.paidAt ?? invoice.paidAt,
      provider: sse.snapshot.provider ?? invoice.provider,
      updatedAt: sse.snapshot.updatedAt ?? invoice.updatedAt,
      fulfillmentGroupId:
        sse.snapshot.fulfillmentGroupId !== undefined
          ? sse.snapshot.fulfillmentGroupId
          : invoice.fulfillmentGroupId,
    }
  }, [invoice, sse.snapshot])

  async function handleStartPayment() {
    if (!liveInvoice || !isUnpaid(liveInvoice) || isSubmittingPayment) return

    setIsSubmittingPayment(true)
    setPaymentError(null)
    setSessionExpired(false)

    try {
      const res = await fetch(`/api/bff/shipping-invoices/${encodeURIComponent(invoiceId)}/pay`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          provider: selectedProvider,
        }),
      })

      const body = (await res.json().catch(() => null)) as
        | StartShippingPaymentResponse
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
          "We couldn’t start shipping payment.",
        )
        setIsSubmittingPayment(false)
        return
      }

      if (!body.redirectUrl) {
        setPaymentError("Payment started, but no redirect URL was returned.")
        setIsSubmittingPayment(false)
        return
      }

      if (!body.shippingInvoicePaymentId) {
        setPaymentError("Payment started, but no shipping invoice payment id was returned.")
        setIsSubmittingPayment(false)
        return
      }

      window.sessionStorage.setItem(
        "mk_shipping_invoice_payment_return_payment_id",
        body.shippingInvoicePaymentId,
      )

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
  const createdAt = formatDateTime(liveInvoice?.createdAt)
  const updatedAt = formatDateTime(liveInvoice?.updatedAt)
  const dueAt = formatDateTime(liveInvoice?.dueAt)
  const paidAt = formatDateTime(liveInvoice?.paidAt)
  const provider = formatProvider(liveInvoice?.provider)

  const showAwaitingConfirmation =
    isUnpaid(liveInvoice) && normalizeStatus(liveInvoice?.provider) !== ""

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
              {isUnpaid(liveInvoice) ? "Complete shipping payment" : "Shipping invoice details"}
            </h1>
            <p className="mt-2 text-sm text-stone-600 sm:text-base">
              This payment is for Open Box / combined shipping only. It does not re-charge you for the items themselves.
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
            {formatStatus(liveInvoice?.status)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Amount due</p>
          <p className="mt-1 text-sm font-semibold text-stone-900" data-testid="shipping-invoice-detail-amount">
            {amount ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Provider</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="shipping-invoice-detail-provider">
            {provider}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Due</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="shipping-invoice-detail-due-at">
            {dueAt ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Paid at</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="shipping-invoice-detail-paid-at">
            {paidAt ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Created</p>
          <p className="mt-1 text-sm text-stone-900">{createdAt ?? "—"}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Updated</p>
          <p className="mt-1 text-sm text-stone-900">{updatedAt ?? "—"}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Open Box</p>
          <p className="mt-1 text-sm text-stone-900">
            {liveInvoice?.fulfillmentGroupId ?? "—"}
          </p>
        </div>
      </section>

      <PaymentContextRow
        testId="shipping-invoice-detail-payment-context"
        imageUrl={liveInvoice?.previewImageUrl}
        imageAlt={buildShippingTitle(liveInvoice)}
        fallbackLabel="Ship"
        badge="Shipping payment"
        title={buildShippingTitle(liveInvoice)}
        context={buildShippingContext(liveInvoice)}
        helper={buildShippingHelper(liveInvoice)}
        amount={amount}
      />

      {liveInvoice?.items?.length ? (
        <section
          className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
          data-testid="shipping-invoice-detail-items"
        >
          <h2 className="text-lg font-semibold text-stone-900">
            This invoice covers shipping for
          </h2>

          <ul className="mt-3 space-y-3">
            {liveInvoice.items.map((item, index) => (
              <CoveredItemRow
                key={`${item.orderId ?? "order"}-${item.listingId ?? "listing"}-${index}`}
                item={item}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {showAwaitingConfirmation ? (
        <PaymentStatusPanel
          testId="shipping-invoice-detail-awaiting-confirmation"
          tone="info"
          title="Waiting for payment confirmation"
          body="Your shipping payment has been started, but it is not final until we confirm it from the payment provider. This page will update automatically when confirmation arrives."
          actions={[
            { label: "Back to dashboard", href: "/dashboard", variant: "secondary" },
          ]}
        />
      ) : null}

      {isUnpaid(liveInvoice) ? (
        <section
          className="rounded-2xl border border-blue-200 bg-blue-50 p-6"
          data-testid="shipping-invoice-detail-payment-panel"
        >
          <h2 className="text-lg font-semibold text-blue-950">Pay shipping</h2>
          <p className="mt-2 text-sm leading-6 text-blue-900">
            Choose a payment provider to complete this Open Box shipping payment. Payment is only considered complete when the backend confirms it.
          </p>

          <fieldset className="mt-4 space-y-2">
            <legend className="block text-sm font-medium text-blue-950">Payment provider</legend>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-blue-950">
                <input
                  type="radio"
                  name="shipping-payment-provider"
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
                  name="shipping-payment-provider"
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

            <Link
              href="/dashboard"
              className="inline-flex rounded-full border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-950 transition hover:bg-blue-100"
              data-testid="shipping-invoice-detail-back-dashboard"
            >
              Back to dashboard
            </Link>
          </div>

          {paymentError ? (
            <div className="mt-4">
              <PaymentStatusPanel
                testId="shipping-invoice-detail-payment-error"
                tone="error"
                title="We couldn’t start shipping payment"
                body={paymentError}
                actions={[
                  { label: "Back to dashboard", href: "/dashboard", variant: "secondary" },
                ]}
              />
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
        <>
          <PaymentStatusPanel
            testId="shipping-invoice-detail-payment-confirmed"
            tone="success"
            title="Shipping payment confirmed"
            body="We’ve confirmed this shipping payment. Your Open Box shipment can continue through packing and fulfillment."
            actions={[
              { label: "Back to dashboard", href: "/dashboard", variant: "secondary" },
            ]}
          />

          <section
            className="rounded-2xl border border-green-200 bg-green-50 p-6"
            data-testid="shipping-invoice-detail-paid-state"
          >
            <h2 className="text-lg font-semibold text-green-900">Shipping payment complete</h2>
            <p className="mt-2 text-sm leading-6 text-green-800">
              Shipping payment has been confirmed for this Open Box shipment.
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
        </>
      )}

      <section
        className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
        data-testid="shipping-invoice-detail-support"
      >
        <h2 className="text-lg font-semibold text-stone-900">Need help?</h2>
        <p className="mt-2 text-sm text-stone-600">
          If something looks wrong with this shipping invoice or payment state, contact support and include the shipping invoice id.
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