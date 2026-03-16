"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

type CheckoutStartResponse = {
  cartId: string
  holdId: string
  expiresAt: string
}

type Props = {
  initialEmail?: string | null
  isAuthenticated: boolean
  initialCheckout?: CheckoutStartResponse | null
  initialError?: string | null
}

const CHECKOUT_HOLD_STORAGE_KEY = "mk_checkout_hold"

export function CheckoutStartClient({
  initialEmail,
  isAuthenticated,
  initialCheckout,
  initialError,
}: Props) {
  const [email, setEmail] = useState(initialEmail ?? "")
  const [checkout, setCheckout] = useState<CheckoutStartResponse | null>(initialCheckout ?? null)
  const [heartbeatError, setHeartbeatError] = useState<string | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  const intervalRef = useRef<number | null>(null)

  const formattedExpiry = (() => {
    if (!checkout?.expiresAt) return null

    const date = new Date(checkout.expiresAt)
    if (Number.isNaN(date.getTime())) return checkout.expiresAt

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  })()

  useEffect(() => {
    if (typeof window === "undefined") return

    if (checkout && !isExpired) {
      window.sessionStorage.setItem(
        CHECKOUT_HOLD_STORAGE_KEY,
        JSON.stringify({
          cartId: checkout.cartId,
          holdId: checkout.holdId,
          expiresAt: checkout.expiresAt,
        }),
      )
      return
    }

    window.sessionStorage.removeItem(CHECKOUT_HOLD_STORAGE_KEY)
  }, [checkout, isExpired])

  useEffect(() => {
    if (!checkout || isExpired) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const activeCheckout = checkout

    async function sendHeartbeat() {
      try {
        const res = await fetch("/api/bff/checkout/heartbeat", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            holdId: activeCheckout.holdId,
          }),
        })

        if (!res.ok) {
          setIsExpired(true)
          setHeartbeatError("Your checkout hold expired. Items are no longer reserved.")
          return
        }

        const data = (await res.json()) as { expiresAt?: string | null }
        const nextExpiresAt = data.expiresAt

        if (typeof nextExpiresAt === "string" && nextExpiresAt.length > 0) {
          setCheckout((current) =>
            current
              ? {
                ...current,
                expiresAt: nextExpiresAt,
              }
              : current,
          )
        }
      } catch {
        setIsExpired(true)
        setHeartbeatError("Your checkout hold expired. Items are no longer reserved.")
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
  }, [checkout, isExpired])

  return (
    <div className="space-y-6" data-testid="checkout-page">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Checkout
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Secure your checkout hold
        </h1>
        <p className="max-w-2xl text-sm text-stone-600 sm:text-base">
          We&apos;ll create a temporary checkout hold before payment so availability can be
          confirmed safely.
        </p>
      </section>

      {!checkout ? (
        <section
          className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
          data-testid="checkout-start-card"
        >
          {!isAuthenticated ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-800" htmlFor="guest-email">
                Email for guest checkout
              </label>
              <input
                id="guest-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2"
                placeholder="you@example.com"
                data-testid="checkout-guest-email"
              />
              <p className="text-xs text-stone-500">
                We&apos;ll use this to identify your checkout session and send updates later.
              </p>
            </div>
          ) : (
            <p className="text-sm text-stone-600" data-testid="checkout-authenticated-copy">
              You&apos;re signed in, so we can start checkout using your account information.
            </p>
          )}

          {initialError ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              data-testid="checkout-start-error"
            >
              {initialError}
            </div>
          ) : null}

          <button
            type="submit"
            form="checkout-start-form"
            className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white"
            data-testid="checkout-start-button"
          >
            Start checkout
          </button>
        </section>
      ) : isExpired ? (
        <section
          className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm"
          data-testid="checkout-expired-state"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
              Hold expired
            </p>
            <h2 className="text-xl font-semibold text-red-950">
              Your checkout hold expired
            </h2>
          </div>

          <p className="text-sm text-red-900" data-testid="checkout-expired-message">
            {heartbeatError ?? "Your checkout hold expired. Items are no longer reserved."}
          </p>

          <Link
            href="/cart"
            className="inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
            data-testid="checkout-return-to-cart"
          >
            Return to cart
          </Link>
        </section>
      ) : (
        <section
          className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm"
          data-testid="checkout-active-hold"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Hold active
            </p>
            <h2 className="text-xl font-semibold text-emerald-950">
              Your items are temporarily reserved for checkout
            </h2>
          </div>

          <dl className="grid gap-3 text-sm text-emerald-950 sm:grid-cols-2">
            <div>
              <dt className="font-medium">Cart ID</dt>
              <dd data-testid="checkout-cart-id">{checkout.cartId}</dd>
            </div>
            <div>
              <dt className="font-medium">Hold ID</dt>
              <dd data-testid="checkout-hold-id">{checkout.holdId}</dd>
            </div>
            <div>
              <dt className="font-medium">Expires at</dt>
              <dd data-testid="checkout-expires-at">{formattedExpiry ?? checkout.expiresAt}</dd>
            </div>
          </dl>

          <p className="text-sm text-emerald-900" data-testid="checkout-hold-message">
            Keep this page open while you continue checkout. We&apos;ll maintain the hold while you
            remain active.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/checkout/pay?holdId=${encodeURIComponent(checkout.holdId)}`}
              className="inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
              data-testid="checkout-continue-to-payment"
            >
              Continue to payment
            </Link>

            <Link
              href="/cart"
              className="inline-flex rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-medium text-emerald-950 hover:bg-emerald-100"
              data-testid="checkout-back-to-cart"
            >
              Back to cart
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}