"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
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

type StartShippingInvoicePaymentResponse = {
  providerCheckoutId?: string | null
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

const SHIPPING_RETURN_PAYMENT_ID_KEY = "mk_shipping_invoice_payment_return_payment_id"
const SHIPPING_RETURN_INVOICE_ID_KEY = "mk_shipping_invoice_payment_return_invoice_id"
const SHIPPING_RETURN_SESSION_EVENT = "mk:shipping-return-session-changed"

function getShippingReturnSessionSnapshot() {
  if (typeof window === "undefined") return ""

  const invoiceId = window.sessionStorage.getItem(SHIPPING_RETURN_INVOICE_ID_KEY) ?? ""
  const paymentId = window.sessionStorage.getItem(SHIPPING_RETURN_PAYMENT_ID_KEY) ?? ""

  return `${invoiceId}::${paymentId}`
}

function getShippingReturnSessionServerSnapshot() {
  return ""
}

function subscribeToShippingReturnSession(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => { }
  }

  const onCustomEvent = () => onStoreChange()

  window.addEventListener(SHIPPING_RETURN_SESSION_EVENT, onCustomEvent)

  return () => {
    window.removeEventListener(SHIPPING_RETURN_SESSION_EVENT, onCustomEvent)
  }
}

function notifyShippingReturnSessionChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(SHIPPING_RETURN_SESSION_EVENT))
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

function normalizeStatus(value?: string | null) {
  return (value ?? "").trim().toUpperCase()
}

function formatShippingInvoiceStatus(value?: string | null) {
  switch (normalizeStatus(value)) {
    case "UNPAID":
      return "Unpaid"
    case "PAID":
      return "Paid"
    case "VOID":
      return "Void"
    default:
      return value ?? "—"
  }
}

function formatPaymentProvider(value?: string | null) {
  switch (normalizeStatus(value)) {
    case "STRIPE":
      return "Stripe"
    case "PAYPAL":
      return "PayPal"
    default:
      return value ?? "—"
  }
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
    const due = formatDateTime(invoice.dueAt)
    if (due) parts.push(`Due ${due}`)
  }

  return parts.join(" • ")
}

function buildOrderSummary(order: ShippingInvoiceRelatedOrderDto | null | undefined) {
  if (!order?.orderNumber) return "Order"
  const source = order.sourceType?.trim()
  return source ? `Order ${order.orderNumber} • ${source}` : `Order ${order.orderNumber}`
}

function buildListingHref(item: ShippingInvoiceItemDto) {
  if (!item.listingId) return null
  if (item.listingSlug) {
    return `/listing/${item.listingSlug}-${item.listingId}`
  }

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

function isPaid(invoice: ShippingInvoiceDto | null) {
  return normalizeStatus(invoice?.status) === "PAID"
}

function isVoid(invoice: ShippingInvoiceDto | null) {
  return normalizeStatus(invoice?.status) === "VOID"
}

export function ShippingInvoiceDetailClient({ invoiceId }: Props) {
  const [invoice, setInvoice] = useState<ShippingInvoiceDto | null>(null)
  const [currentOpenBoxInvoice, setCurrentOpenBoxInvoice] = useState<ShippingInvoiceDto | null>(null)
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

  const shippingReturnSessionRaw = useSyncExternalStore(
    subscribeToShippingReturnSession,
    getShippingReturnSessionSnapshot,
    getShippingReturnSessionServerSnapshot,
  )

  const shippingReturnSession = useMemo(() => {
    const [invoiceId, paymentId] = shippingReturnSessionRaw.split("::")
    return {
      invoiceId: invoiceId || null,
      paymentId: paymentId || null,
    }
  }, [shippingReturnSessionRaw])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!isPaid(invoice)) return

    window.sessionStorage.removeItem(SHIPPING_RETURN_PAYMENT_ID_KEY)
    window.sessionStorage.removeItem(SHIPPING_RETURN_INVOICE_ID_KEY)
    notifyShippingReturnSessionChanged()
  }, [invoice])

  useEffect(() => {
    let isMounted = true

    async function loadCurrentOpenBoxInvoice() {
      try {
        const res = await fetch("/api/bff/me/open-box/shipping-invoice", {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        })

        const body = (await res.json().catch(() => null)) as ShippingInvoiceDto | null

        if (!isMounted) return
        if (!res.ok || !body || !body.shippingInvoiceId) return

        setCurrentOpenBoxInvoice(body)
      } catch {
        // best-effort only
      }
    }

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
          void loadCurrentOpenBoxInvoice()
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

        if (normalizeStatus(body.status) === "VOID") {
          void loadCurrentOpenBoxInvoice()
        }
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
      updatedAt: snapshot.updatedAt ?? invoice.updatedAt,
    }
  }, [invoice, sse.snapshot])

  const hasReturnContext =
    shippingReturnSession.invoiceId === invoiceId &&
    Boolean(shippingReturnSession.paymentId)

  const isAwaitingBackendConfirmation = hasReturnContext && !isPaid(liveInvoice)

  async function handleStartPayment() {
    if (!liveInvoice || isSubmittingPayment || isPaid(liveInvoice) || isVoid(liveInvoice)) return

    setIsSubmittingPayment(true)
    setPaymentError(null)
    setSessionExpired(false)

    try {
      const origin = window.location.origin

      const res = await fetch(`/api/bff/shipping-invoices/${encodeURIComponent(invoiceId)}/pay`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          provider: selectedProvider,
          successUrl: `${origin}/shipping-invoices/return?invoiceId=${encodeURIComponent(invoiceId)}`,
          cancelUrl: `${origin}/shipping-invoices/${encodeURIComponent(invoiceId)}`,
        }),
      })

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
        setPaymentError("Shipping payment started, but no redirect URL was returned.")
        setIsSubmittingPayment(false)
        return
      }

      if (!body.providerCheckoutId) {
        setPaymentError("Shipping payment started, but no provider checkout id was returned.")
        setIsSubmittingPayment(false)
        return
      }

      window.sessionStorage.setItem(SHIPPING_RETURN_PAYMENT_ID_KEY, body.providerCheckoutId)
      window.sessionStorage.setItem(SHIPPING_RETURN_INVOICE_ID_KEY, invoiceId)
      notifyShippingReturnSessionChanged()

      const redirectUrl = new URL(body.redirectUrl, window.location.origin)
      redirectUrl.searchParams.set("paymentId", body.providerCheckoutId)
      redirectUrl.searchParams.set("invoiceId", invoiceId)

      window.location.assign(redirectUrl.toString())
    } catch {
      setPaymentError("We couldn’t start shipping payment.")
      setIsSubmittingPayment(false)
    }
  }

  const amount = formatMoney(liveInvoice?.amountCents, liveInvoice?.currencyCode)
  const paidAt = formatDateTime(liveInvoice?.paidAt)
  const dueAt = formatDateTime(liveInvoice?.dueAt)
  const createdAt = formatDateTime(liveInvoice?.createdAt)
  const updatedAt = formatDateTime(liveInvoice?.updatedAt)

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

        {currentOpenBoxInvoice?.shippingInvoiceId &&
          currentOpenBoxInvoice.shippingInvoiceId !== invoiceId ? (
          <div
            className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
            data-testid="shipping-invoice-detail-current-invoice-hint"
          >
            This invoice may no longer be the current Open Box shipping invoice.
            <div className="mt-3">
              <Link
                href={`/shipping-invoices/${encodeURIComponent(currentOpenBoxInvoice.shippingInvoiceId)}`}
                className="inline-flex rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
                data-testid="shipping-invoice-detail-go-current-invoice"
              >
                Go to current shipping invoice
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          {sessionExpired || errorStatus === 401 ? (
            <Link
              href={`/login?returnTo=${encodeURIComponent(`/shipping-invoices/${invoiceId}`)}`}
              className="inline-flex rounded-full bg-red-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
              data-testid="shipping-invoice-detail-sign-in-again"
            >
              Sign in again
            </Link>
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

  if (isVoid(liveInvoice)) {
    return (
      <section
        className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        data-testid="shipping-invoice-detail-void-state"
      >
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">Shipping invoice</p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">This shipping invoice is no longer active</h1>
          <p className="text-sm text-stone-600 sm:text-base">
            This invoice has been voided or replaced and can no longer be used for payment.
          </p>
        </div>

        {liveInvoice ? (
          <PaymentContextRow
            testId="shipping-invoice-detail-void-context"
            imageUrl={liveInvoice.previewImageUrl}
            imageAlt={buildShippingTitle(liveInvoice)}
            fallbackLabel="Ship"
            badge="Shipping invoice"
            title={buildShippingTitle(liveInvoice)}
            context={buildShippingContext(liveInvoice)}
            helper={buildShippingHelper(liveInvoice)}
            amount={formatMoney(liveInvoice.amountCents, liveInvoice.currencyCode)}
          />
        ) : null}

        <PaymentStatusPanel
          testId="shipping-invoice-detail-void-panel"
          tone="info"
          title="This invoice cannot be paid"
          body="A different shipping invoice is now the current invoice for this Open Box shipment, or this invoice is no longer valid for payment."
          actions={
            currentOpenBoxInvoice?.shippingInvoiceId &&
              currentOpenBoxInvoice.shippingInvoiceId !== invoiceId
              ? [
                {
                  label: "Go to current shipping invoice",
                  href: `/shipping-invoices/${encodeURIComponent(currentOpenBoxInvoice.shippingInvoiceId)}`,
                  variant: "primary" as const,
                },
                { label: "Back to dashboard", href: "/dashboard", variant: "secondary" as const },
              ]
              : [{ label: "Back to dashboard", href: "/dashboard", variant: "secondary" as const }]
          }
        />
      </section>
    )
  }

  return (
    <section
      className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      data-testid="shipping-invoice-detail-card"
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">Shipping invoice</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">
              {isPaid(liveInvoice) ? "Shipping payment confirmed" : "Your shipping invoice is ready"}
            </h1>
            <p className="mt-2 text-sm text-stone-600 sm:text-base">
              {isPaid(liveInvoice)
                ? "This shipping payment has been confirmed. Your Open Box shipment can continue through packing and fulfillment."
                : "Pay shipping to allow your Open Box shipment to continue through packing and fulfillment."}
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
          <p className="text-xs text-amber-700" data-testid="shipping-invoice-detail-live-status-message">
            Showing the last known invoice state. You can refresh the page if needed.
          </p>
        ) : null}
      </div>

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

      <section
        className="grid gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="shipping-invoice-detail-summary"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Invoice id</p>
          <p className="mt-1 break-all text-sm text-stone-900" data-testid="shipping-invoice-detail-id">
            {liveInvoice?.shippingInvoiceId ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Status</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="shipping-invoice-detail-status">
            {formatShippingInvoiceStatus(liveInvoice?.status)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Amount due</p>
          <p className="mt-1 text-sm font-semibold text-stone-900" data-testid="shipping-invoice-detail-amount">
            {amount ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Paid at</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="shipping-invoice-detail-paid-at">
            {paidAt ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Due at</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="shipping-invoice-detail-due-at">
            {dueAt ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Provider</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="shipping-invoice-detail-provider">
            {formatPaymentProvider(liveInvoice?.provider)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Created</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="shipping-invoice-detail-created-at">
            {createdAt ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Last updated</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="shipping-invoice-detail-updated-at">
            {updatedAt ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Fulfillment group</p>
          <p className="mt-1 break-all text-sm text-stone-900" data-testid="shipping-invoice-detail-fulfillment-group">
            {liveInvoice?.fulfillmentGroupId ?? "—"}
          </p>
        </div>
      </section>

      {liveInvoice?.items?.length ? (
        <section
          className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
          data-testid="shipping-invoice-detail-items"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-stone-900">This invoice covers shipping for</h2>
            <p className="text-sm text-stone-600">
              These are the items currently included in this Open Box shipment.
            </p>
          </div>

          <ul className="mt-4 space-y-3">
            {liveInvoice.items.map((item, index) => {
              const href = buildListingHref(item)

              return (
                <li
                  key={`${item.listingId ?? "item"}-${item.orderId ?? index}`}
                  className="flex gap-4 rounded-xl border border-stone-200 bg-white p-4"
                  data-testid="shipping-invoice-detail-item-row"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                    {item.primaryImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.primaryImageUrl}
                        alt={item.title ?? "Shipment item"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-stone-500">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {href ? (
                      <Link
                        href={href}
                        className="block truncate text-sm font-semibold text-stone-900 hover:underline"
                      >
                        {item.title ?? "Listing"}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-semibold text-stone-900">
                        {item.title ?? "Listing"}
                      </p>
                    )}

                    <p className="mt-1 text-xs uppercase tracking-wide text-stone-500">
                      {buildOrderSummary({
                        orderId: item.orderId ?? undefined,
                        orderNumber: item.orderNumber ?? null,
                        sourceType: item.sourceType ?? null,
                      })}
                    </p>

                    {item.mineralName || item.locality ? (
                      <p className="mt-1 text-sm text-stone-600">
                        {[item.mineralName, item.locality].filter(Boolean).join(" • ")}
                      </p>
                    ) : null}

                    {item.quantity && item.quantity > 1 ? (
                      <p className="mt-1 text-sm text-stone-600">Quantity: {item.quantity}</p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {!isPaid(liveInvoice) ? (
        <>
          {isAwaitingBackendConfirmation ? (
            <PaymentStatusPanel
              testId="shipping-invoice-detail-awaiting-confirmation"
              tone="info"
              title="Waiting for backend-confirmed shipping payment"
              body="If you’ve just returned from Stripe or PayPal, this page will update when the backend confirms the payment."
            />
          ) : (
            <PaymentStatusPanel
              testId="shipping-invoice-detail-ready-for-payment"
              tone="info"
              title="Your shipping invoice is ready for payment"
              body="Pay shipping to allow your Open Box shipment to continue through packing and fulfillment."
            />
          )}

          <section
            className="rounded-2xl border border-blue-200 bg-blue-50 p-6"
            data-testid="shipping-invoice-detail-payment-panel"
          >
            <h2 className="text-lg font-semibold text-blue-950">Pay shipping</h2>
            <p className="mt-2 text-sm leading-6 text-blue-900">
              This payment covers shipping only.
              {isAwaitingBackendConfirmation
                ? " If you already completed payment with Stripe or PayPal, this page will update when backend confirmation is received."
                : " Once payment is confirmed, your shipment can continue through packing and fulfillment."}
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
                data-testid="shipping-invoice-detail-back-dashboard-link"
              >
                Back to dashboard
              </Link>
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
              <Link
                href={`/login?returnTo=${encodeURIComponent(`/shipping-invoices/${invoiceId}`)}`}
                className="mt-4 inline-flex rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
                data-testid="shipping-invoice-detail-payment-sign-in-again"
              >
                Sign in again
              </Link>
            ) : null}
          </section>
        </>
      ) : (
        <>
          <PaymentStatusPanel
            testId="shipping-invoice-detail-payment-confirmed"
            tone="success"
            title="Shipping payment confirmed"
            body="This shipping payment has been confirmed by the backend. Your Open Box shipment can continue through packing and fulfillment."
          />

          <section
            className="rounded-2xl border border-green-200 bg-green-50 p-6"
            data-testid="shipping-invoice-detail-paid-state"
          >
            <h2 className="text-lg font-semibold text-green-900">Payment complete</h2>
            <p className="mt-2 text-sm leading-6 text-green-800">
              Shipping payment has been confirmed. You can return to your dashboard to follow the next fulfillment steps.
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
          If something looks wrong with this shipping invoice or payment state, contact support and include your shipping invoice id.
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