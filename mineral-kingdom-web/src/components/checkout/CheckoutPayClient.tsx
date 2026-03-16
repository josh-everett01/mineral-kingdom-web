"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type Props = {
  initialHoldId?: string | null
}

type PaymentInitiationResponse = {
  paymentId: string
  provider: string
  redirectUrl?: string | null
  checkoutUrl?: string | null
}

const CHECKOUT_HOLD_STORAGE_KEY = "mk_checkout_hold"
const CHECKOUT_PAYMENT_STORAGE_KEY = "mk_checkout_payment_id"

export function CheckoutPayClient({ initialHoldId }: Props) {
  const [selectedProvider, setSelectedProvider] = useState<"stripe" | "paypal">("stripe")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  async function handleStartPayment() {
    if (!holdId || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/bff/payments/initiate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          holdId,
          provider: selectedProvider,
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
          Choose a payment provider
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
      </dl>

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