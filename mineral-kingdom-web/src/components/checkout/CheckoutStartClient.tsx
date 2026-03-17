"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

type CheckoutStartResponse = {
  cartId: string
  holdId: string
  expiresAt: string
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

type Props = {
  initialEmail?: string | null
  isAuthenticated: boolean
  initialCheckout?: CheckoutStartResponse | null
  initialError?: string | null
}

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

export function CheckoutStartClient({
  initialEmail,
  isAuthenticated,
  initialCheckout,
  initialError,
}: Props) {
  const [email, setEmail] = useState(initialEmail ?? "")
  const [checkout, setCheckout] = useState<CheckoutStartResponse | null>(initialCheckout ?? null)
  const [associatedEmail, setAssociatedEmail] = useState<string | null>(null)
  const [heartbeatError, setHeartbeatError] = useState<string | null>(null)
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null)
  const [extensionMessage, setExtensionMessage] = useState<string | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isExtending, setIsExtending] = useState(false)
  const [canExtend, setCanExtend] = useState(false)
  const [extensionCount, setExtensionCount] = useState(0)
  const [maxExtensions, setMaxExtensions] = useState(0)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const intervalRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)

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

  const countdownLabel = checkout && !isExpired
    ? formatCountdown(checkout.expiresAt, nowMs)
    : null

  useEffect(() => {
    if (checkout && !associatedEmail) {
      void (async () => {
        try {
          const res = await fetch("/api/bff/checkout/active", {
            method: "GET",
            cache: "no-store",
          })

          if (!res.ok) return
          const body = (await res.json()) as ActiveCheckoutResponse

          if (!body.active) return

          if (body.guestEmail) {
            setAssociatedEmail(body.guestEmail)
            setEmail(body.guestEmail)
          }

          setCanExtend(Boolean(body.canExtend))
          setExtensionCount(body.extensionCount ?? 0)
          setMaxExtensions(body.maxExtensions ?? 0)
        } catch {
          // best effort only
        }
      })()

      return
    }

    if (checkout) return

    void (async () => {
      try {
        const res = await fetch("/api/bff/checkout/active", {
          method: "GET",
          cache: "no-store",
        })

        if (!res.ok) return
        const body = (await res.json()) as ActiveCheckoutResponse

        if (!body.active || !body.holdId || !body.expiresAt) return

        setCheckout({
          cartId: body.cartId,
          holdId: body.holdId,
          expiresAt: body.expiresAt,
        })

        if (body.guestEmail) {
          setAssociatedEmail(body.guestEmail)
          setEmail(body.guestEmail)
        }

        setCanExtend(Boolean(body.canExtend))
        setExtensionCount(body.extensionCount ?? 0)
        setMaxExtensions(body.maxExtensions ?? 0)
      } catch {
        // best effort only
      }
    })()
  }, [associatedEmail, checkout])

  useEffect(() => {
    if (!checkout || isExpired) {
      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
      return
    }

    const updateNow = () => {
      const nextNow = Date.now()
      setNowMs(nextNow)

      const next = formatCountdown(checkout.expiresAt, nextNow)
      if (next === "00:00") {
        setIsExpired(true)
      }
    }

    updateNow()
    countdownIntervalRef.current = window.setInterval(updateNow, 1000)

    return () => {
      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }
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

        const data = (await res.json()) as CheckoutHeartbeatResponse

        if (typeof data.expiresAt === "string" && data.expiresAt.length > 0) {
          setCheckout((current) =>
            current
              ? {
                ...current,
                expiresAt: data.expiresAt,
              }
              : current,
          )
        }

        setCanExtend(Boolean(data.canExtend))
        setExtensionCount(data.extensionCount ?? 0)
        setMaxExtensions(data.maxExtensions ?? 0)
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

  async function handleResetCheckout() {
    if (isResetting) return

    setIsResetting(true)
    setRecoveryMessage(null)
    setHeartbeatError(null)
    setExtensionMessage(null)

    try {
      const res = await fetch("/api/bff/checkout/reset", {
        method: "POST",
        cache: "no-store",
      })

      if (!res.ok) {
        setRecoveryMessage("We couldn't reset the current checkout session right now.")
        setIsResetting(false)
        return
      }

      setCheckout(null)
      setAssociatedEmail(null)
      setEmail("")
      setIsExpired(false)
      setNowMs(Date.now())
      setCanExtend(false)
      setExtensionCount(0)
      setMaxExtensions(0)
      setRecoveryMessage("Checkout session reset. Enter a different email to continue.")
      setIsResetting(false)
    } catch {
      setRecoveryMessage("We couldn't reset the current checkout session right now.")
      setIsResetting(false)
    }
  }

  async function handleExtendReservation() {
    if (!checkout || isExtending || !canExtend) return

    setIsExtending(true)
    setExtensionMessage(null)
    setHeartbeatError(null)

    try {
      const res = await fetch("/api/bff/checkout/extend", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          holdId: checkout.holdId,
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

      setCheckout((current) =>
        current
          ? {
            ...current,
            expiresAt: body.expiresAt,
          }
          : current,
      )
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

          {recoveryMessage ? (
            <div
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
              data-testid="checkout-reset-success"
            >
              {recoveryMessage}
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
            <div>
              <dt className="font-medium">Reservation expires in</dt>
              <dd data-testid="checkout-countdown">{countdownLabel ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium">Extensions used</dt>
              <dd data-testid="checkout-extension-count">
                {extensionCount} / {maxExtensions}
              </dd>
            </div>
            {associatedEmail ? (
              <div>
                <dt className="font-medium">Checkout reserved for</dt>
                <dd data-testid="checkout-associated-email">{associatedEmail}</dd>
              </div>
            ) : null}
          </dl>

          <p className="text-sm text-emerald-900" data-testid="checkout-hold-message">
            Your reservation remains active until the countdown ends. You can extend it near expiry,
            subject to limits.
          </p>

          {canExtend ? (
            <button
              type="button"
              onClick={() => void handleExtendReservation()}
              disabled={isExtending}
              className="inline-flex rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-medium text-emerald-950 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="checkout-extend-reservation"
            >
              {isExtending ? "Extending..." : "Extend reservation"}
            </button>
          ) : null}

          {extensionMessage ? (
            <div
              className="rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-900"
              data-testid="checkout-extension-message"
            >
              {extensionMessage}
            </div>
          ) : null}

          {!isAuthenticated && associatedEmail ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void handleResetCheckout()}
                disabled={isResetting}
                className="inline-flex rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-medium text-emerald-950 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="checkout-reset-email"
              >
                {isResetting ? "Resetting..." : "Not my email? Start over"}
              </button>

              {recoveryMessage ? (
                <div
                  className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                  data-testid="checkout-reset-message"
                >
                  {recoveryMessage}
                </div>
              ) : null}
            </div>
          ) : null}

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