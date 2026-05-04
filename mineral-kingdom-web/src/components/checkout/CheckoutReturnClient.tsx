"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSse } from "@/lib/sse/useSse"

type PaymentConfirmationResponse = {
  paymentId: string
  provider: string
  paymentStatus: string
  isConfirmed: boolean
  orderId?: string | null
  orderNumber?: string | null
  orderStatus?: string | null
  orderTotalCents?: number | null
  orderCurrencyCode?: string | null
  guestEmail?: string | null
}

type CapturePaymentResponse = {
  paymentId: string
  provider: string
  paymentStatus: string
  providerPaymentId?: string | null
}

const EARLY_FALLBACK_POLL_WINDOW_MS = 10_000
const EARLY_FALLBACK_POLL_INTERVAL_MS = 1_500
const DISCONNECTED_FALLBACK_POLL_INTERVAL_MS = 3_000

const statusCardClass = "mk-glass-strong rounded-[2rem] p-5 sm:p-6"

const progressTrackClass =
  "h-2 overflow-hidden rounded-full bg-[color:var(--mk-panel-muted)]"

const progressBarClass =
  "h-full rounded-full bg-gradient-to-r from-[color:var(--mk-amethyst)] via-[color:var(--mk-gold)] to-[color:var(--mk-sky)] transition-all duration-500"

function readStoredPaymentId(): string | null {
  if (typeof window === "undefined") return null
  return window.sessionStorage.getItem("mk_checkout_payment_id")
}

function writeOrderPaymentLink(orderId: string, paymentId: string) {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(`mk_order_payment_${orderId}`, paymentId)
}

function isTerminalFailureStatus(status: string | null | undefined) {
  if (!status) return false

  const normalized = status.toUpperCase()

  return (
    normalized === "FAILED" ||
    normalized === "CANCELLED" ||
    normalized === "EXPIRED" ||
    normalized === "DECLINED"
  )
}

function isPendingStatus(status: string | null | undefined) {
  if (!status) return true

  const normalized = status.toUpperCase()

  return (
    normalized === "CREATED" ||
    normalized === "REDIRECTED" ||
    normalized === "PENDING" ||
    normalized === "PROCESSING"
  )
}

function getProgressPercent(paymentStatus: string | null, elapsedMs: number) {
  const normalized = paymentStatus?.toUpperCase() ?? ""

  if (normalized === "SUCCEEDED") {
    return 90
  }

  if (normalized === "REDIRECTED") {
    if (elapsedMs < 2_000) return 45
    if (elapsedMs < 5_000) return 55
    if (elapsedMs < 10_000) return 65
    if (elapsedMs < 20_000) return 72
    return 78
  }

  if (normalized === "CREATED") {
    if (elapsedMs < 2_000) return 25
    if (elapsedMs < 5_000) return 35
    if (elapsedMs < 10_000) return 45
    return 55
  }

  if (normalized === "PENDING" || normalized === "PROCESSING") {
    if (elapsedMs < 2_000) return 55
    if (elapsedMs < 5_000) return 65
    if (elapsedMs < 10_000) return 72
    if (elapsedMs < 20_000) return 80
    return 85
  }

  return 40
}

function getStageMessage(args: {
  isCancelled: boolean
  paymentStatus: string | null
  elapsedMs: number
  provider: string | null
}) {
  const { isCancelled, paymentStatus, elapsedMs, provider } = args

  if (isCancelled) {
    return "Your payment flow was cancelled. No purchase was confirmed."
  }

  if (isTerminalFailureStatus(paymentStatus)) {
    return "We could not confirm this payment. Please review the payment status below."
  }

  const normalized = paymentStatus?.toUpperCase() ?? ""

  if (normalized === "SUCCEEDED") {
    return "Payment received. Finalizing your order now…"
  }

  if (provider?.toUpperCase() === "PAYPAL" && normalized === "REDIRECTED") {
    return "We recorded your return from PayPal. Confirming payment now…"
  }

  if (elapsedMs >= 60_000) {
    return "This is taking longer than usual, but your payment may still be processing safely in the background. Please keep this page open while we continue checking."
  }

  if (elapsedMs >= 30_000) {
    return "Still confirming your payment with the provider. Please keep this page open a little longer."
  }

  if (elapsedMs >= 10_000) {
    return "Almost there — we’re still waiting for backend confirmation."
  }

  return "We recorded your return from the payment provider. Confirming payment now…"
}

function getSupportMessage(args: {
  isCancelled: boolean
  paymentStatus: string | null
  isConfirmed: boolean
}) {
  const { isCancelled, paymentStatus, isConfirmed } = args

  if (isCancelled || isConfirmed || isTerminalFailureStatus(paymentStatus)) {
    return null
  }

  return "Please keep this page open while we finalize your order. If this page is interrupted, your payment may still complete in the background — come back here and we’ll continue checking automatically."
}

function ReturnHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <section className={statusCardClass}>
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
  )
}

function StatusMessageCard({
  children,
  testId,
}: {
  children: ReactNode
  testId: string
}) {
  return (
    <section
      className="rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm text-[color:var(--mk-ink)] shadow-sm"
      data-testid={testId}
    >
      {children}
    </section>
  )
}

function WarningNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[color:var(--mk-gold)]/40 bg-[color:var(--mk-panel)] px-3 py-2 text-xs text-[color:var(--mk-gold)]">
      {children}
    </div>
  )
}

function ErrorCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-4 text-sm text-[color:var(--mk-danger)]">
      {children}
    </div>
  )
}

export function CheckoutReturnClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [paymentId] = useState<string | null>(() => readStoredPaymentId())
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)

  const redirectedRef = useRef(false)
  const attemptedPayPalCaptureRef = useRef(false)
  const startTimeRef = useRef<number>(Date.now())
  const loadInFlightRef = useRef(false)

  const isCancelled = searchParams.get("cancelled") === "1"

  const sseUrl = useMemo(() => {
    if (!paymentId) return null
    return `/api/bff/sse/checkout-payments/${paymentId}`
  }, [paymentId])

  const { connected, connecting, lastEventAt } = useSse(sseUrl)

  useEffect(() => {
    startTimeRef.current = Date.now()
    setElapsedMs(0)

    const intervalId = window.setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current)
    }, 500)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const displayMessage =
    message ??
    getStageMessage({
      isCancelled,
      paymentStatus,
      elapsedMs,
      provider,
    })

  const supportMessage = getSupportMessage({
    isCancelled,
    paymentStatus,
    isConfirmed,
  })

  const progressPercent = useMemo(() => {
    if (isCancelled) return 0
    if (isConfirmed) return 100
    return getProgressPercent(paymentStatus, elapsedMs)
  }, [elapsedMs, isCancelled, isConfirmed, paymentStatus])

  const shouldWarnBeforeUnload = useMemo(() => {
    if (isCancelled) return false
    if (redirectedRef.current) return false
    if (isConfirmed) return false
    if (error) return false

    return isLoading || isPendingStatus(paymentStatus) || paymentStatus === "SUCCEEDED"
  }, [error, isCancelled, isConfirmed, isLoading, paymentStatus])

  useEffect(() => {
    if (!shouldWarnBeforeUnload) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [shouldWarnBeforeUnload])

  const loadConfirmation = useCallback(async () => {
    if (!paymentId || redirectedRef.current || loadInFlightRef.current) return

    loadInFlightRef.current = true

    try {
      setIsLoading(true)

      const res = await fetch(`/api/bff/payments/${paymentId}/confirmation`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      })

      if (!res.ok) {
        setError("We couldn’t load payment confirmation right now.")
        return
      }

      const body = (await res.json()) as PaymentConfirmationResponse

      if (redirectedRef.current) return

      setError(null)
      setProvider(body.provider ?? null)
      setPaymentStatus(body.paymentStatus ?? null)
      setIsConfirmed(body.isConfirmed === true)

      if (body.orderId && body.isConfirmed) {
        redirectedRef.current = true
        writeOrderPaymentLink(body.orderId, paymentId)
        router.replace(
          `/order-confirmation?orderId=${encodeURIComponent(body.orderId)}&paymentId=${encodeURIComponent(paymentId)}`,
        )
        return
      }

      const shouldCapturePayPal =
        !attemptedPayPalCaptureRef.current &&
        !!body.provider &&
        body.provider.toUpperCase() === "PAYPAL" &&
        body.paymentStatus.toUpperCase() === "REDIRECTED"

      if (shouldCapturePayPal) {
        attemptedPayPalCaptureRef.current = true

        try {
          const captureRes = await fetch(`/api/bff/payments/${paymentId}/capture`, {
            method: "POST",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          })

          if (!captureRes.ok) {
            const captureBody = (await captureRes.json().catch(() => null)) as
              | { message?: string; error?: string }
              | null

            setError(
              captureBody?.message ||
              captureBody?.error ||
              "We couldn’t capture the PayPal payment right now.",
            )
            return
          }

          const captureBody = (await captureRes.json().catch(() => null)) as
            | CapturePaymentResponse
            | null

          setError(null)
          setPaymentStatus(captureBody?.paymentStatus ?? body.paymentStatus ?? null)
          setMessage("We captured your PayPal payment. Finalizing your order now…")
        } catch {
          setError("We couldn’t capture the PayPal payment right now.")
          return
        }
      } else {
        setMessage(null)
      }
    } catch {
      setError("We couldn’t load payment confirmation right now.")
    } finally {
      loadInFlightRef.current = false
      setIsLoading(false)
    }
  }, [paymentId, router])

  useEffect(() => {
    void loadConfirmation()
  }, [loadConfirmation])

  useEffect(() => {
    if (!lastEventAt || redirectedRef.current) return
    void loadConfirmation()
  }, [lastEventAt, loadConfirmation])

  useEffect(() => {
    if (!paymentId || redirectedRef.current || isConfirmed || isCancelled) return
    if (isTerminalFailureStatus(paymentStatus)) return

    const withinEarlyWindow = elapsedMs < EARLY_FALLBACK_POLL_WINDOW_MS
    const shouldFallbackPoll = withinEarlyWindow || !connected

    if (!shouldFallbackPoll) return

    const intervalMs = withinEarlyWindow
      ? EARLY_FALLBACK_POLL_INTERVAL_MS
      : DISCONNECTED_FALLBACK_POLL_INTERVAL_MS

    const intervalId = window.setInterval(() => {
      if (redirectedRef.current || loadInFlightRef.current) return
      void loadConfirmation()
    }, intervalMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [
    connected,
    elapsedMs,
    isCancelled,
    isConfirmed,
    paymentId,
    paymentStatus,
    loadConfirmation,
  ])

  return (
    <div className="space-y-5">
      <ReturnHeader
        eyebrow="Checkout return"
        title="We recorded your return from the payment provider"
        description="Returning from the payment provider is never treated as proof of payment. Your order will update only after backend confirmation is received."
      />

      {displayMessage ? (
        <StatusMessageCard
          testId={isCancelled ? "checkout-return-cancelled" : "checkout-return-status-message"}
        >
          <div className="space-y-3">
            <p>{displayMessage}</p>

            {!isCancelled && !isConfirmed && !isTerminalFailureStatus(paymentStatus) ? (
              <div className="space-y-2" data-testid="checkout-return-progress">
                <div className="flex items-center justify-between text-xs font-semibold mk-muted-text">
                  <span>Progress</span>
                  <span>{progressPercent}%</span>
                </div>

                <div aria-hidden="true" className={progressTrackClass}>
                  <div
                    className={progressBarClass}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : null}

            {supportMessage ? (
              <WarningNote>
                <p className="font-semibold">Please keep this page open</p>
                <p className="mt-1 leading-5">{supportMessage}</p>
              </WarningNote>
            ) : null}

            {!isCancelled && paymentStatus ? (
              <div className="text-xs mk-muted-text" data-testid="checkout-return-live-status">
                {connected
                  ? `Live payment updates connected. Current payment status: ${paymentStatus}.`
                  : connecting
                    ? `Connecting to live payment updates. Current payment status: ${paymentStatus}.`
                    : `Live updates temporarily disconnected. We’ll keep checking automatically. Current payment status: ${paymentStatus}.`}
              </div>
            ) : null}
          </div>
        </StatusMessageCard>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-4 py-3 text-sm mk-muted-text">
          Loading payment status…
        </div>
      ) : null}

      {error ? <ErrorCard>{error}</ErrorCard> : null}
    </div>
  )
}