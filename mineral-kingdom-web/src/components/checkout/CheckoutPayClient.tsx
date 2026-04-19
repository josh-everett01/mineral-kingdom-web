"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"

type Props = {
  initialHoldId?: string | null
  isAuthenticated: boolean
}

type PaymentInitiationResponse = {
  paymentId: string
  provider: string
  redirectUrl?: string | null
  checkoutUrl?: string | null
}

type ActiveCheckoutResponse = {
  active: boolean
  cartId: string
  holdId?: string | null
  expiresAt?: string | null
  guestEmail?: string | null
  status?: string | null
  canExtend?: boolean
  extensionCount?: number
  maxExtensions?: number
}

type CheckoutHeartbeatResponse = {
  holdId: string
  expiresAt: string
  canExtend: boolean
  extensionCount: number
  maxExtensions: number
}

type ExtendCheckoutResponse = {
  holdId: string
  expiresAt: string
  canExtend: boolean
  extensionCount: number
  maxExtensions: number
}

const CHECKOUT_HOLD_STORAGE_KEY = "mk_checkout_hold"
const CHECKOUT_PAYMENT_STORAGE_KEY = "mk_checkout_payment_id"

function formatCountdown(expiresAt?: string | null, nowMs?: number) {
  if (!expiresAt) return null

  const target = new Date(expiresAt).getTime()
  const now = nowMs ?? Date.now()
  const diffMs = Math.max(target - now, 0)

  const totalSeconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function CheckoutPayClient({ initialHoldId, isAuthenticated }: Props) {
  const [selectedProvider, setSelectedProvider] = useState<"stripe" | "paypal">("stripe")
  const [selectedShippingMode, setSelectedShippingMode] = useState<"SHIP_NOW" | "OPEN_BOX">(
    "SHIP_NOW",
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExtending, setIsExtending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extensionMessage, setExtensionMessage] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [canExtend, setCanExtend] = useState(false)
  const [extensionCount, setExtensionCount] = useState(0)
  const [maxExtensions, setMaxExtensions] = useState(0)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const intervalRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)

  const holdId = useMemo(() => {
    if (initialHoldId) return initialHoldId
    if (typeof window === "undefined") return null

    const raw = window.sessionStorage.getItem(CHECKOUT_HOLD_STORAGE_KEY)
    if (!raw) return null

    try {
      const parsed = JSON.parse(raw) as { holdId?: string | null }
      return parsed.holdId ?? null
    } catch {
      return null
    }
  }, [initialHoldId])

  const countdownLabel = holdId && expiresAt ? formatCountdown(expiresAt, nowMs) : null

  useEffect(() => {
    if (typeof window === "undefined" || !holdId) return

    const raw = window.sessionStorage.getItem(CHECKOUT_HOLD_STORAGE_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as {
        cartId?: string | null
        holdId?: string | null
        expiresAt?: string | null
      }

      window.sessionStorage.setItem(
        CHECKOUT_HOLD_STORAGE_KEY,
        JSON.stringify({
          ...parsed,
          holdId,
        }),
      )
    } catch {
      window.sessionStorage.setItem(
        CHECKOUT_HOLD_STORAGE_KEY,
        JSON.stringify({
          holdId,
        }),
      )
    }
  }, [holdId])

  useEffect(() => {
    if (!holdId) return

    void (async () => {
      try {
        const res = await fetch("/api/bff/checkout/active", {
          method: "GET",
          cache: "no-store",
        })

        if (!res.ok) return
        const body = (await res.json()) as ActiveCheckoutResponse

        if (!body.active || !body.holdId || body.holdId !== holdId) return

        setExpiresAt(body.expiresAt ?? null)
        setCanExtend(Boolean(body.canExtend))
        setExtensionCount(body.extensionCount ?? 0)
        setMaxExtensions(body.maxExtensions ?? 0)
      } catch {
        // best effort only
      }
    })()
  }, [holdId])

  useEffect(() => {
    if (!holdId || !expiresAt) {
      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
      return
    }

    const updateNow = () => {
      setNowMs(Date.now())
    }

    updateNow()
    countdownIntervalRef.current = window.setInterval(updateNow, 1000)

    return () => {
      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }
  }, [holdId, expiresAt])

  useEffect(() => {
    if (!holdId) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    async function sendHeartbeat() {
      try {
        const res = await fetch("/api/bff/checkout/heartbeat", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            holdId,
          }),
        })

        if (!res.ok) {
          setError("Your checkout hold expired. Return to checkout to start again.")
          return
        }

        const data = (await res.json()) as CheckoutHeartbeatResponse
        setExpiresAt(data.expiresAt)
        setCanExtend(Boolean(data.canExtend))
        setExtensionCount(data.extensionCount ?? 0)
        setMaxExtensions(data.maxExtensions ?? 0)
      } catch {
        setError("We couldn't verify your checkout reservation.")
      }
    }

    intervalRef.current = window.setInterval(() => {
      void sendHeartbeat()
    }, 30_000)

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [holdId])

  async function handleExtendReservation() {
    if (!holdId || !canExtend || isExtending) return

    setIsExtending(true)
    setExtensionMessage(null)
    setError(null)

    try {
      const res = await fetch("/api/bff/checkout/extend", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          holdId,
        }),
        cache: "no-store",
      })

      const body = (await res.json().catch(() => null)) as
        | ExtendCheckoutResponse
        | { message?: string; error?: string }
        | null

      if (!res.ok || !body || !("holdId" in body)) {
        setExtensionMessage(
          (body && "message" in body && body.message) ||
          (body && "error" in body && body.error) ||
          "We couldn't extend your reservation.",
        )
        setIsExtending(false)
        return
      }

      setExpiresAt(body.expiresAt)
      setCanExtend(Boolean(body.canExtend))
      setExtensionCount(body.extensionCount ?? 0)
      setMaxExtensions(body.maxExtensions ?? 0)
      setNowMs(Date.now())
      setExtensionMessage("Reservation extended.")
      setIsExtending(false)
    } catch {
      setExtensionMessage("We couldn't extend your reservation.")
      setIsExtending(false)
    }
  }

  async function handleStartPayment() {
    if (!holdId || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/bff/payments-initiate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          holdId,
          provider: selectedProvider,
          shippingMode: isAuthenticated ? selectedShippingMode : "SHIP_NOW",
        }),
      })

      const body = (await res.json().catch(() => null)) as
        | PaymentInitiationResponse
        | { message?: string; error?: string }
        | null

      if (!res.ok || !body || !("paymentId" in body)) {
        setError(
          (body && "message" in body && body.message) ||
          (body && "error" in body && body.error) ||
          "We couldn't initiate payment.",
        )
        setIsSubmitting(false)
        return
      }

      window.sessionStorage.setItem(CHECKOUT_PAYMENT_STORAGE_KEY, body.paymentId)

      const redirectTarget = body.redirectUrl || body.checkoutUrl
      if (!redirectTarget) {
        setError("Payment started, but no redirect URL was returned.")
        setIsSubmitting(false)
        return
      }

      window.location.assign(redirectTarget)
    } catch {
      setError("We couldn't initiate payment.")
      setIsSubmitting(false)
    }
  }

  if (!holdId) {
    return (
      <section
        className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm"
        data-testid="checkout-pay-missing-hold"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Payment</p>
        <h1 className="text-2xl font-bold tracking-tight text-amber-950">
          A checkout hold is required before payment can begin
        </h1>
        <p className="text-sm text-amber-900">
          Start checkout first so inventory is safely reserved before payment is initiated.
        </p>
        <Link
          href="/checkout"
          className="inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white"
          data-testid="checkout-pay-return-to-checkout"
        >
          Return to checkout
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">Payment</p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Choose payment and shipping preference
        </h1>
        <p className="text-sm text-stone-600 sm:text-base">
          Payment can only start from an active checkout hold. Final paid status is confirmed by
          backend webhook processing, not redirect parameters.
        </p>
      </div>

      <dl className="grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
        <div>
          <dt className="font-medium">Checkout hold ID</dt>
          <dd data-testid="checkout-pay-hold-id">{holdId}</dd>
        </div>
        <div>
          <dt className="font-medium">Selected provider</dt>
          <dd data-testid="checkout-pay-provider">{selectedProvider}</dd>
        </div>
        <div>
          <dt className="font-medium">Reservation expires in</dt>
          <dd data-testid="checkout-pay-countdown">{countdownLabel ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium">Extensions used</dt>
          <dd data-testid="checkout-pay-extension-count">
            {extensionCount} / {maxExtensions}
          </dd>
        </div>
      </dl>

      {canExtend ? (
        <button
          type="button"
          onClick={() => void handleExtendReservation()}
          disabled={isExtending}
          className="inline-flex rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-900 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="checkout-pay-extend-reservation"
        >
          {isExtending ? "Extending..." : "Extend reservation"}
        </button>
      ) : null}

      {extensionMessage ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          data-testid="checkout-pay-extension-message"
        >
          {extensionMessage}
        </div>
      ) : null}

      {isAuthenticated ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-stone-900">Shipping preference</legend>

          <label className="flex items-start gap-3 rounded-xl border border-stone-200 p-4">
            <input
              type="radio"
              name="shipping-mode"
              value="SHIP_NOW"
              checked={selectedShippingMode === "SHIP_NOW"}
              onChange={() => setSelectedShippingMode("SHIP_NOW")}
              data-testid="checkout-pay-shipping-ship-now"
            />
            <span className="text-sm text-stone-800">
              <span className="block font-medium">Ship now</span>
              <span className="block text-stone-600">
                Complete this purchase for normal shipment now.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-stone-200 p-4">
            <input
              type="radio"
              name="shipping-mode"
              value="OPEN_BOX"
              checked={selectedShippingMode === "OPEN_BOX"}
              onChange={() => setSelectedShippingMode("OPEN_BOX")}
              data-testid="checkout-pay-shipping-open-box"
            />
            <span className="text-sm text-stone-800">
              <span className="block font-medium">Add to Open Box</span>
              <span className="block text-stone-600">
                Keep this order with your Open Box so it can be grouped with other eligible
                purchases.
              </span>
            </span>
          </label>
        </fieldset>
      ) : (
        <div
          className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700"
          data-testid="checkout-pay-guest-shipping-mode"
        >
          Guest checkout always uses normal shipment. Sign in if you want to use Open Box.
        </div>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-stone-900">Payment method</legend>

        <label className="flex items-center gap-3 rounded-xl border border-stone-200 p-4">
          <input
            type="radio"
            name="payment-provider"
            value="stripe"
            checked={selectedProvider === "stripe"}
            onChange={() => setSelectedProvider("stripe")}
          />
          <span className="text-sm text-stone-800">Stripe</span>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-stone-200 p-4">
          <input
            type="radio"
            name="payment-provider"
            value="paypal"
            checked={selectedProvider === "paypal"}
            onChange={() => setSelectedProvider("paypal")}
          />
          <span className="text-sm text-stone-800">PayPal / Venmo</span>
        </label>
      </fieldset>

      {error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          data-testid="checkout-pay-error"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleStartPayment}
          disabled={isSubmitting}
          className="inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="checkout-pay-start"
        >
          {isSubmitting ? "Redirecting…" : "Continue to provider"}
        </button>

        <Link
          href="/checkout"
          className="inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white"
          data-testid="checkout-pay-return-to-checkout"
        >
          Return to checkout
        </Link>
      </div>
    </section>
  )
}