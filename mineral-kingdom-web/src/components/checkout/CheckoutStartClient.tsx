"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Clock3, Mail, ShieldCheck } from "lucide-react"

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

  const countdownLabel = checkout && !isExpired ? formatCountdown(checkout.expiresAt, nowMs) : null

  const checkoutHoldId = checkout?.holdId ?? null

  useEffect(() => {
    if (checkoutHoldId) {
      void (async () => {
        try {
          const res = await fetch("/api/bff/checkout/active", {
            method: "GET",
            cache: "no-store",
          })

          if (!res.ok) return
          const body = (await res.json()) as ActiveCheckoutResponse

          if (!body.active) return

          if (body.holdId === checkoutHoldId && body.expiresAt) {
            setCheckout((current) =>
              current
                ? {
                  ...current,
                  expiresAt: body.expiresAt!,
                }
                : current,
            )
            setIsExpired(false)
            setHeartbeatError(null)
            setNowMs(Date.now())
          }

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
  }, [checkoutHoldId])

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
          if (res.status === 404 || res.status === 409 || res.status === 410) {
            setIsExpired(true)
            setHeartbeatError("Your checkout hold expired. Items are no longer reserved.")
            return
          }

          setHeartbeatError("We couldn’t verify your checkout reservation. Retrying automatically.")
          return
        }

        const data = (await res.json()) as CheckoutHeartbeatResponse
        setHeartbeatError(null)

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
        setHeartbeatError("We couldn’t verify your checkout reservation. Retrying automatically.")
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
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Checkout
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
          Secure your checkout hold
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 mk-muted-text sm:text-base">
          We&apos;ll create a temporary checkout hold before payment so availability can be confirmed
          safely.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <CheckoutPill icon={<ShieldCheck className="h-4 w-4" />} label="Verified hold" />
          <CheckoutPill icon={<Clock3 className="h-4 w-4" />} label="Timed reservation" />
          <CheckoutPill icon={<Mail className="h-4 w-4" />} label="Order updates" />
        </div>
      </section>

      {!checkout ? (
        <section className="mk-glass-strong space-y-4 rounded-[2rem] p-5 sm:p-6" data-testid="checkout-start-card">
          {!isAuthenticated ? (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[color:var(--mk-ink)]" htmlFor="guest-email">
                Email for guest checkout
              </label>
              <input
                id="guest-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20"
                placeholder="you@example.com"
                data-testid="checkout-guest-email"
              />
              <p className="text-xs mk-muted-text">
                We&apos;ll use this to identify your checkout session and send updates later.
              </p>
            </div>
          ) : (
            <p className="text-sm mk-muted-text" data-testid="checkout-authenticated-copy">
              You&apos;re signed in, so we can start checkout using your account information.
            </p>
          )}

          {initialError ? (
            <Alert tone="danger" testId="checkout-start-error">
              {initialError}
            </Alert>
          ) : null}

          {recoveryMessage ? (
            <Alert tone="success" testId="checkout-reset-success">
              {recoveryMessage}
            </Alert>
          ) : null}

          <button
            type="submit"
            form="checkout-start-form"
            className="mk-cta rounded-2xl px-5 py-2.5 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99]"
            data-testid="checkout-start-button"
          >
            Start checkout
          </button>
        </section>
      ) : isExpired ? (
        <section
          className="space-y-4 rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 shadow-sm sm:p-6"
          data-testid="checkout-expired-state"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-danger)]">
              Hold expired
            </p>
            <h2 className="text-xl font-semibold text-[color:var(--mk-ink)]">
              Your checkout hold expired
            </h2>
          </div>

          <p className="text-sm mk-muted-text" data-testid="checkout-expired-message">
            {heartbeatError ?? "Your checkout hold expired. Items are no longer reserved."}
          </p>

          <Link
            href="/cart"
            className="mk-cta inline-flex rounded-2xl px-5 py-2.5 text-sm font-semibold"
            data-testid="checkout-return-to-cart"
          >
            Return to cart
          </Link>
        </section>
      ) : (
        <section
          className="space-y-4 rounded-[2rem] border border-[color:var(--mk-success)]/40 bg-[color:var(--mk-panel-muted)] p-5 shadow-sm sm:p-6"
          data-testid="checkout-active-hold"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-success)]">
              Hold active
            </p>
            <h2 className="text-xl font-semibold text-[color:var(--mk-ink)]">
              Your items are temporarily reserved for checkout
            </h2>
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <DetailItem label="Cart ID" value={checkout.cartId} testId="checkout-cart-id" />
            <DetailItem label="Hold ID" value={checkout.holdId} testId="checkout-hold-id" />
            <DetailItem
              label="Expires at"
              value={formattedExpiry ?? checkout.expiresAt}
              testId="checkout-expires-at"
            />
            <DetailItem
              label="Reservation expires in"
              value={countdownLabel ?? "—"}
              testId="checkout-countdown"
            />
            <DetailItem
              label="Extensions used"
              value={`${extensionCount} / ${maxExtensions}`}
              testId="checkout-extension-count"
            />
            {associatedEmail ? (
              <DetailItem
                label="Checkout reserved for"
                value={associatedEmail}
                testId="checkout-associated-email"
              />
            ) : null}
          </dl>

          <p className="text-sm mk-muted-text" data-testid="checkout-hold-message">
            Your reservation remains active until the countdown ends. You can extend it near expiry,
            subject to limits.
          </p>

          {canExtend ? (
            <button
              type="button"
              onClick={() => void handleExtendReservation()}
              disabled={isExtending}
              className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-5 py-2.5 text-sm font-semibold text-[color:var(--mk-ink)] shadow-sm transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="checkout-extend-reservation"
            >
              {isExtending ? "Extending..." : "Extend reservation"}
            </button>
          ) : null}

          {extensionMessage ? (
            <Alert tone="success" testId="checkout-extension-message">
              {extensionMessage}
            </Alert>
          ) : null}

          {!isAuthenticated && associatedEmail ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void handleResetCheckout()}
                disabled={isResetting}
                className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-transparent px-4 py-2 text-sm font-semibold mk-muted-text transition hover:bg-[color:var(--mk-panel-muted)] hover:text-[color:var(--mk-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="checkout-reset-email"
              >
                {isResetting ? "Resetting..." : "Not my email? Start over"}
              </button>

              {recoveryMessage ? (
                <Alert tone="warning" testId="checkout-reset-message">
                  {recoveryMessage}
                </Alert>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/checkout/pay?holdId=${encodeURIComponent(checkout.holdId)}`}
              className="mk-cta inline-flex min-h-12 items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99] sm:min-w-48"
              data-testid="checkout-continue-to-payment"
            >
              Continue to payment
            </Link>

            <Link
              href="/cart"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-5 py-3 text-sm font-semibold text-[color:var(--mk-ink)] shadow-sm transition hover:bg-[color:var(--mk-panel-muted)] sm:min-w-36"
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

function CheckoutPill({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="mk-glass flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium">
      <span className="text-[color:var(--mk-gold)]">{icon}</span>
      <span>{label}</span>
    </div>
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
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
        {label}
      </dt>
      <dd
        className="mt-1 break-all text-sm mk-muted-text"
        data-testid={testId}
        suppressHydrationWarning
      >
        {value}
      </dd>
    </div>
  )
}

function Alert({
  tone,
  testId,
  children,
}: {
  tone: "success" | "warning" | "danger"
  testId: string
  children: React.ReactNode
}) {
  const toneClass =
    tone === "success"
      ? "border-[color:var(--mk-success)]/40 text-[color:var(--mk-success)]"
      : tone === "warning"
        ? "border-[color:var(--mk-border-strong)] text-[color:var(--mk-gold)]"
        : "border-[color:var(--mk-danger)]/50 text-[color:var(--mk-danger)]"

  return (
    <div
      className={`rounded-2xl border ${toneClass} bg-[color:var(--mk-panel-muted)] p-3 text-sm`}
      data-testid={testId}
    >
      {children}
    </div>
  )
}