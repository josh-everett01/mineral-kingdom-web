"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { PaymentContextRow } from "@/components/payments/PaymentContextRow"
import { PaymentStatusPanel } from "@/components/payments/PaymentStatusPanel"
import { useSse } from "@/lib/sse/useSse"

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

type CaptureShippingInvoicePaymentResponse = {
  shippingInvoiceId?: string
  provider?: string | null
  paymentStatus?: string | null
  providerPaymentId?: string | null
}

type LoadableError = {
  status?: number
  message?: string
  error?: string
  code?: string
}

const SHIPPING_RETURN_PAYMENT_ID_KEY = "mk_shipping_invoice_payment_return_payment_id"
const SHIPPING_RETURN_INVOICE_ID_KEY = "mk_shipping_invoice_payment_return_invoice_id"
const EARLY_FALLBACK_POLL_WINDOW_MS = 10_000
const EARLY_FALLBACK_POLL_INTERVAL_MS = 1_500
const DISCONNECTED_FALLBACK_POLL_INTERVAL_MS = 3_000

function readStoredPaymentId() {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem(SHIPPING_RETURN_PAYMENT_ID_KEY)
}

function readStoredInvoiceId() {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem(SHIPPING_RETURN_INVOICE_ID_KEY)
}

function writeStoredContext(paymentId: string, invoiceId: string) {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(SHIPPING_RETURN_PAYMENT_ID_KEY, paymentId)
  window.sessionStorage.setItem(SHIPPING_RETURN_INVOICE_ID_KEY, invoiceId)
}

function clearStoredContext() {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(SHIPPING_RETURN_PAYMENT_ID_KEY)
  window.sessionStorage.removeItem(SHIPPING_RETURN_INVOICE_ID_KEY)
}

function formatMoney(cents?: number | null, currencyCode?: string | null) {
  if (cents == null) return null

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

function normalizeStatus(value?: string | null) {
  return (value ?? "").trim().toUpperCase()
}

function isPaid(invoice: ShippingInvoiceDto | null) {
  return normalizeStatus(invoice?.status) === "PAID"
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
    return `Shipping invoice • Open Box • Order ${firstOrder.orderNumber} + ${invoice.relatedOrders!.length - 1
      } more`
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

function getProgressPercent(args: { invoice: ShippingInvoiceDto | null; elapsedMs: number }) {
  const { invoice, elapsedMs } = args

  if (isPaid(invoice)) return 100

  const provider = normalizeStatus(invoice?.provider)

  if (provider === "PAYPAL") {
    if (elapsedMs < 2_000) return 45
    if (elapsedMs < 5_000) return 55
    if (elapsedMs < 10_000) return 65
    if (elapsedMs < 20_000) return 72
    return 78
  }

  if (elapsedMs < 2_000) return 35
  if (elapsedMs < 5_000) return 45
  if (elapsedMs < 10_000) return 55
  if (elapsedMs < 20_000) return 68
  return 78
}

function getStageMessage(args: {
  invoice: ShippingInvoiceDto | null
  elapsedMs: number
}) {
  const { invoice, elapsedMs } = args

  if (isPaid(invoice)) {
    return "Shipping payment confirmed. Finalizing your Open Box shipment now…"
  }

  if (elapsedMs >= 60_000) {
    return "This is taking longer than usual, but your shipping payment may still be processing safely. Please keep this page open while we continue checking for secure payment confirmation."
  }

  if (elapsedMs >= 30_000) {
    return "We’re still waiting for secure payment confirmation. Please keep this page open a little longer."
  }

  if (elapsedMs >= 10_000) {
    return "Almost there — we’re still waiting for secure payment confirmation."
  }

  return "We recorded your return from the payment provider. Confirming your shipping payment now…"
}

function getFallbackMessage(args: {
  invoice: ShippingInvoiceDto | null
  connected: boolean
  connecting: boolean
  elapsedMs: number
}) {
  const { invoice, connected, connecting, elapsedMs } = args

  if (isPaid(invoice)) return null

  if (!connected && !connecting) {
    return "Live updates are temporarily unavailable. We’ll keep checking your shipping invoice automatically using the latest confirmed payment state we can reach."
  }

  if (elapsedMs >= 30_000) {
    return "You do not need to pay twice. If this page stays pending, return to your shipping invoice or dashboard and check the current status there."
  }

  return "Returning from the payment provider does not itself finalize shipping payment. Your invoice will update after secure payment confirmation is received."
}

export function ShippingInvoicePaymentReturnClient() {
  const searchParams = useSearchParams()

  const paymentIdFromQuery = searchParams.get("paymentId")
  const invoiceIdFromQuery = searchParams.get("invoiceId")

  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [hasResolvedContext, setHasResolvedContext] = useState(false)
  const [contextResolutionFailed, setContextResolutionFailed] = useState(false)
  const [invoice, setInvoice] = useState<ShippingInvoiceDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)

  const startTimeRef = useRef<number>(0)
  const loadInFlightRef = useRef(false)
  const redirectedRef = useRef(false)
  const attemptedPayPalCaptureRef = useRef(false)
  const reloadScheduledRef = useRef(false)

  const sse = useSse<ShippingInvoiceRealtimeSnapshot>(
    invoiceId ? `/api/bff/sse/shipping-invoices/${encodeURIComponent(invoiceId)}` : null,
    {
      parseSnapshot: (data) => normalizeSseSnapshot(JSON.parse(data) as unknown),
    },
  )

  const resolveContext = useCallback(async () => {
    const resolvedPaymentId =
      paymentIdFromQuery && paymentIdFromQuery.trim().length > 0
        ? paymentIdFromQuery
        : readStoredPaymentId()

    const resolvedInvoiceId =
      invoiceIdFromQuery && invoiceIdFromQuery.trim().length > 0
        ? invoiceIdFromQuery
        : readStoredInvoiceId()

    setPaymentId(resolvedPaymentId ?? null)

    if (resolvedPaymentId && resolvedInvoiceId) {
      writeStoredContext(resolvedPaymentId, resolvedInvoiceId)
      setInvoiceId(resolvedInvoiceId)
      setContextResolutionFailed(false)
      setHasResolvedContext(true)
      return
    }

    if (resolvedInvoiceId) {
      setInvoiceId(resolvedInvoiceId)
      setContextResolutionFailed(false)
      setHasResolvedContext(true)
      return
    }

    try {
      const res = await fetch("/api/bff/me/open-box/shipping-invoice", {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      })

      const body = (await res.json().catch(() => null)) as ShippingInvoiceDto | LoadableError | null

      if (res.ok && body && "shippingInvoiceId" in body && body.shippingInvoiceId) {
        setInvoiceId(body.shippingInvoiceId)
        setInvoice(body)

        if (resolvedPaymentId) {
          writeStoredContext(resolvedPaymentId, body.shippingInvoiceId)
        } else if (body.providerCheckoutId) {
          writeStoredContext(body.providerCheckoutId, body.shippingInvoiceId)
          setPaymentId(body.providerCheckoutId)
        }

        setContextResolutionFailed(false)
        setHasResolvedContext(true)
        return
      }
    } catch {
      // fall through to missing-context state
    }

    setInvoiceId(null)
    setContextResolutionFailed(true)
    setHasResolvedContext(true)
  }, [invoiceIdFromQuery, paymentIdFromQuery])

  useEffect(() => {
    void resolveContext()
  }, [resolveContext])

  useEffect(() => {
    if (!hasResolvedContext) return

    startTimeRef.current = Date.now()
    setElapsedMs(0)

    const intervalId = window.setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current)
    }, 1_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [hasResolvedContext, invoiceId])

  useEffect(() => {
    if (!sse.snapshot) return

    setInvoice((current) => {
      if (!current) return current

      const next: ShippingInvoiceDto = {
        ...current,
        shippingInvoiceId: sse.snapshot?.shippingInvoiceId ?? current.shippingInvoiceId,
        fulfillmentGroupId:
          sse.snapshot?.fulfillmentGroupId !== undefined
            ? sse.snapshot.fulfillmentGroupId
            : current.fulfillmentGroupId,
        amountCents: sse.snapshot?.amountCents ?? current.amountCents,
        currencyCode: sse.snapshot?.currencyCode ?? current.currencyCode,
        status: sse.snapshot?.status ?? current.status,
        paidAt: sse.snapshot?.paidAt ?? current.paidAt,
        provider: sse.snapshot?.provider ?? current.provider,
        updatedAt: sse.snapshot?.updatedAt ?? current.updatedAt,
      }

      if (normalizeStatus(next.status) === "PAID") {
        clearStoredContext()
      }

      return next
    })
  }, [sse.snapshot])

  const tryCapturePayPalInvoice = useCallback(async () => {
    if (!invoiceId || attemptedPayPalCaptureRef.current) return

    attemptedPayPalCaptureRef.current = true

    try {
      const captureRes = await fetch(
        `/api/bff/shipping-invoices/${encodeURIComponent(invoiceId)}/capture`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      )

      if (!captureRes.ok) {
        const captureBody = (await captureRes.json().catch(() => null)) as
          | { message?: string; error?: string }
          | null

        setError(
          captureBody?.message ||
          captureBody?.error ||
          "We couldn’t capture the PayPal shipping payment right now.",
        )
        return
      }

      const captureBody = (await captureRes.json().catch(() => null)) as
        | CaptureShippingInvoicePaymentResponse
        | null

      setError(null)

      if (captureBody?.paymentStatus?.toUpperCase() === "PAID") {
        setInvoice((current) =>
          current
            ? {
              ...current,
              status: "PAID",
              provider: captureBody.provider ?? current.provider,
              updatedAt: new Date().toISOString(),
            }
            : current,
        )
      }

      if (!reloadScheduledRef.current) {
        reloadScheduledRef.current = true
        window.setTimeout(() => {
          window.location.reload()
        }, 250)
      }
    } catch {
      setError("We couldn’t capture the PayPal shipping payment right now.")
    }
  }, [invoiceId])

  const loadInvoice = useCallback(async () => {
    if (!invoiceId || loadInFlightRef.current) return

    loadInFlightRef.current = true
    setIsLoading(true)

    try {
      const res = await fetch(`/api/bff/shipping-invoices/${encodeURIComponent(invoiceId)}`, {
        cache: "no-store",
      })

      const body = (await res.json().catch(() => null)) as ShippingInvoiceDto | LoadableError | null

      if (!res.ok || !body || !("shippingInvoiceId" in body)) {
        setError(
          (body && "message" in body && typeof body.message === "string" && body.message) ||
          (body && "error" in body && typeof body.error === "string" && body.error) ||
          "We couldn’t load shipping payment confirmation right now.",
        )
        return
      }

      setError(null)
      setInvoice(body)

      const shouldCapturePayPal =
        !attemptedPayPalCaptureRef.current &&
        normalizeStatus(body.provider) === "PAYPAL" &&
        normalizeStatus(body.status) === "UNPAID"

      if (shouldCapturePayPal) {
        await tryCapturePayPalInvoice()
      }

      if (normalizeStatus(body.status) === "PAID") {
        redirectedRef.current = true
        clearStoredContext()
      }
    } catch {
      setError("We couldn’t load shipping payment confirmation right now.")
    } finally {
      loadInFlightRef.current = false
      setIsLoading(false)
    }
  }, [invoiceId, tryCapturePayPalInvoice])

  useEffect(() => {
    if (!hasResolvedContext || !invoiceId) return
    void loadInvoice()
  }, [hasResolvedContext, invoiceId, loadInvoice])

  useEffect(() => {
    if (!sse.lastEventAt || !invoiceId || redirectedRef.current) return
    void loadInvoice()
  }, [invoiceId, loadInvoice, sse.lastEventAt])

  useEffect(() => {
    if (!hasResolvedContext || !invoiceId || redirectedRef.current || isPaid(invoice)) return

    const withinEarlyWindow = elapsedMs < EARLY_FALLBACK_POLL_WINDOW_MS
    const shouldFallbackPoll = withinEarlyWindow || !sse.connected

    if (!shouldFallbackPoll) return

    const intervalMs = withinEarlyWindow
      ? EARLY_FALLBACK_POLL_INTERVAL_MS
      : DISCONNECTED_FALLBACK_POLL_INTERVAL_MS

    const intervalId = window.setInterval(() => {
      if (redirectedRef.current || loadInFlightRef.current) return
      void loadInvoice()
    }, intervalMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [elapsedMs, hasResolvedContext, invoice, invoiceId, loadInvoice, sse.connected])

  const progressPercent = useMemo(() => {
    return getProgressPercent({ invoice, elapsedMs })
  }, [elapsedMs, invoice])

  const stageMessage = useMemo(() => {
    return getStageMessage({ invoice, elapsedMs })
  }, [elapsedMs, invoice])

  const fallbackMessage = useMemo(() => {
    return getFallbackMessage({
      invoice,
      connected: sse.connected,
      connecting: sse.connecting,
      elapsedMs,
    })
  }, [elapsedMs, invoice, sse.connected, sse.connecting])

  const amount = formatMoney(invoice?.amountCents, invoice?.currencyCode)

  if (!hasResolvedContext) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <PaymentStatusPanel
          testId="shipping-payment-return-locating"
          tone="info"
          title="Locating your shipping payment"
          body="We recorded your return from the payment provider. Returning from the payment provider is never treated as proof of payment. We’re locating your shipping invoice now."
        />
      </div>
    )
  }

  if (contextResolutionFailed && !invoiceId) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <PaymentStatusPanel
          testId="shipping-payment-return-missing-context"
          tone="error"
          title="We couldn’t find a shipping payment to confirm"
          body="We couldn’t match this return to a shipping invoice. Returning from the payment provider is never treated as proof of payment. Please go back to your dashboard or shipping invoice to check the current status."
          actions={[
            { label: "Back to dashboard", href: "/dashboard", variant: "secondary" },
            {
              label: "Contact support",
              href: "/support/new?category=PAYMENT_HELP",
              variant: "secondary",
            },
          ]}
        />
      </div>
    )
  }

  if (!invoiceId) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <PaymentStatusPanel
          testId="shipping-payment-return-locating-fallback"
          tone="info"
          title="Locating your shipping payment"
          body="We’re checking your current Open Box shipping invoice so we can confirm the latest backend state."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="mk-glass-strong rounded-[2rem] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Shipping payment return
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
          {isPaid(invoice)
            ? "Shipping payment confirmed"
            : "Waiting for shipping payment confirmation"}
        </h1>

        <p
          className="mt-3 text-sm leading-6 mk-muted-text sm:text-base"
          data-testid="shipping-payment-return-copy"
        >
          Returning from the payment provider does not itself finalize shipping payment. Your
          shipping invoice updates only after secure payment confirmation is received.
        </p>
      </section>

      {invoice ? (
        <PaymentContextRow
          testId="shipping-payment-return-context"
          imageUrl={invoice.previewImageUrl}
          imageAlt={buildShippingTitle(invoice)}
          fallbackLabel="Ship"
          badge="Shipping payment"
          title={buildShippingTitle(invoice)}
          context={buildShippingContext(invoice)}
          helper={buildShippingHelper(invoice)}
          amount={amount}
        />
      ) : null}

      <PaymentStatusPanel
        testId={
          isPaid(invoice)
            ? "shipping-payment-return-confirmed"
            : "shipping-payment-return-pending"
        }
        tone={isPaid(invoice) ? "success" : "info"}
        title={isPaid(invoice) ? "Shipping payment confirmed" : "Waiting for payment confirmation"}
        body={
          isPaid(invoice)
            ? "We’ve confirmed this shipping payment. Your Open Box shipment can continue through packing and fulfillment."
            : stageMessage
        }
        actions={[
          {
            label: "Back to shipping invoice",
            href: `/shipping-invoices/${encodeURIComponent(invoiceId)}`,
            variant: "secondary",
          },
          { label: "Back to dashboard", href: "/dashboard", variant: "secondary" },
        ]}
      />

      {!isPaid(invoice) ? (
        <div
          className="rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm text-[color:var(--mk-ink)] shadow-sm"
          data-testid="shipping-payment-return-status-message"
        >
          <div className="space-y-3">
            <p>{stageMessage}</p>

            <div className="space-y-2" data-testid="shipping-payment-return-progress">
              <div className="flex items-center justify-between text-xs font-semibold mk-muted-text">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>

              <div
                aria-hidden="true"
                className="h-2 overflow-hidden rounded-full bg-[color:var(--mk-panel)]"
              >
                <div
                  className="h-full rounded-full bg-[color:var(--mk-gold)] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {fallbackMessage ? (
              <div
                className="rounded-2xl border border-[color:var(--mk-gold)]/50 bg-[color:var(--mk-panel)] px-3 py-2 text-xs text-[color:var(--mk-gold)]"
                data-testid="shipping-payment-return-fallback-copy"
              >
                {fallbackMessage}
              </div>
            ) : null}

            <div className="text-xs mk-muted-text" data-testid="shipping-payment-return-live-status">
              {invoice?.status
                ? sse.connected
                  ? `Live shipping invoice updates connected. Current invoice status: ${invoice.status}.`
                  : sse.connecting
                    ? `Connecting to live shipping invoice updates. Current invoice status: ${invoice.status}.`
                    : `Live updates temporarily disconnected. We’ll keep checking automatically. Current invoice status: ${invoice.status}.`
                : paymentId
                  ? `We recorded your provider return for payment ${paymentId}.`
                  : "We recorded your return from the payment provider."}
            </div>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-4 py-3 text-sm mk-muted-text">
          Loading shipping payment status…
        </div>
      ) : null}

      {error ? (
        <PaymentStatusPanel
          testId="shipping-payment-return-error"
          tone="error"
          title="We couldn’t confirm shipping payment right now"
          body={error}
          actions={[
            {
              label: "Back to shipping invoice",
              href: `/shipping-invoices/${encodeURIComponent(invoiceId)}`,
              variant: "secondary",
            },
            { label: "Back to dashboard", href: "/dashboard", variant: "secondary" },
            {
              label: "Contact support",
              href: invoiceId
                ? `/support/new?shippingInvoiceId=${encodeURIComponent(invoiceId)}&category=PAYMENT_HELP`
                : "/support/new?category=PAYMENT_HELP",
              variant: "secondary",
            },
          ]}
        />
      ) : null}

      <section
        className="rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
        data-testid="shipping-payment-return-support"
      >
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Need help?</h2>
        <p className="mt-2 text-sm leading-6 mk-muted-text">
          If this page does not update as expected, return to your shipping invoice or dashboard to
          check the latest confirmed payment state. If something still looks wrong, contact support
          and include your shipping invoice id.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={invoiceId ? `/shipping-invoices/${encodeURIComponent(invoiceId)}` : "/dashboard"}
            className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
            data-testid="shipping-payment-return-back-invoice"
          >
            Back to shipping invoice
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
            data-testid="shipping-payment-return-back-dashboard"
          >
            Back to dashboard
          </Link>
          <Link
            href={
              invoiceId
                ? `/support/new?shippingInvoiceId=${encodeURIComponent(invoiceId)}&category=PAYMENT_HELP`
                : "/support/new?category=PAYMENT_HELP"
            }
            className="mk-cta inline-flex rounded-2xl px-4 py-2 text-sm font-semibold"
            data-testid="shipping-payment-return-support-link"
          >
            Contact support
          </Link>
        </div>
      </section>
    </div>
  )
}