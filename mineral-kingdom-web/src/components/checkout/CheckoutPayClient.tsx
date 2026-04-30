"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"

import { ShippingAddressForm, type ShippingAddressDto } from "@/components/checkout/ShippingAddressForm"
import {
  type ShippingRegionCode,
  SHIPPING_REGION_OPTIONS,
  formatShippingRegionLabel,
  isShippingRegionCode,
} from "@/components/shipping/shippingRegions"
import type { CartDto } from "@/lib/cart/cartTypes"

type Props = {
  initialHoldId?: string | null
  isAuthenticated: boolean
  initialCart?: CartDto | null
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
  shippingAddress?: ShippingAddressDto | null
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

type CheckoutPricingPreviewResponse = {
  holdId: string
  subtotalCents: number
  shippingAmountCents: number
  totalCents: number
  currencyCode: string
  shippingMode: string
  selectedRegionCode?: string | null
}

const CHECKOUT_HOLD_STORAGE_KEY = "mk_checkout_hold"
const CHECKOUT_PAYMENT_STORAGE_KEY = "mk_checkout_payment_id"

const inputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20"

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-5 py-2.5 text-sm font-semibold text-[color:var(--mk-ink)] shadow-sm transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"

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

function formatMoney(cents?: number | null): string | null {
  if (typeof cents !== "number") return null

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

export function CheckoutPayClient({
  initialHoldId,
  isAuthenticated,
  initialCart,
}: Props) {
  const [selectedProvider] = useState<"stripe" | "paypal">("stripe")
  const [selectedShippingMode, setSelectedShippingMode] = useState<"SHIP_NOW" | "OPEN_BOX">(
    "SHIP_NOW",
  )
  const [selectedRegionCode, setSelectedRegionCode] = useState<ShippingRegionCode>(() => {
    if (typeof window === "undefined") return "US"

    try {
      const raw = window.sessionStorage.getItem(CHECKOUT_HOLD_STORAGE_KEY)
      if (!raw) return "US"

      const parsed = JSON.parse(raw) as { selectedRegionCode?: string | null }
      const storedRegion = parsed.selectedRegionCode?.toUpperCase()

      return isShippingRegionCode(storedRegion) ? storedRegion : "US"
    } catch {
      return "US"
    }
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExtending, setIsExtending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extensionMessage, setExtensionMessage] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [canExtend, setCanExtend] = useState(false)
  const [extensionCount, setExtensionCount] = useState(0)
  const [maxExtensions, setMaxExtensions] = useState(0)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [pricingPreview, setPricingPreview] = useState<CheckoutPricingPreviewResponse | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [shippingAddress, setShippingAddress] = useState<ShippingAddressDto | null>(null)
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [addressSaved, setAddressSaved] = useState(false)

  const intervalRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)
  const previewRequestSeqRef = useRef(0)

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

  const firstLine = initialCart?.lines?.[0] ?? null
  const lineCount = initialCart?.lines?.length ?? 0
  const subtotalLabel = formatMoney(initialCart?.subtotalCents ?? null)

  const paymentTitle = useMemo(() => {
    if (!firstLine) return "Store checkout"

    if (lineCount > 1) {
      return `${firstLine.title} + ${lineCount - 1} more`
    }

    return firstLine.title
  }, [firstLine, lineCount])

  const paymentContext = useMemo(() => {
    if (!initialCart) return "Store checkout"
    return `Cart ${initialCart.cartId} • Store purchase`
  }, [initialCart])

  const loadPricingPreview = useCallback(
    async (
      nextShippingMode?: "SHIP_NOW" | "OPEN_BOX",
      nextRegionCode?: ShippingRegionCode,
    ) => {
      if (!holdId) return

      const requestSeq = ++previewRequestSeqRef.current

      const shippingMode = isAuthenticated
        ? (nextShippingMode ?? selectedShippingMode)
        : "SHIP_NOW"

      const regionCode =
        shippingMode === "SHIP_NOW" ? (nextRegionCode ?? selectedRegionCode) : null

      setIsLoadingPreview(true)

      try {
        const res = await fetch("/api/bff/checkout/preview-pricing", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            holdId,
            shippingMode,
            selectedRegionCode: regionCode,
          }),
          cache: "no-store",
        })

        const body = (await res.json().catch(() => null)) as
          | CheckoutPricingPreviewResponse
          | { message?: string; error?: string }
          | null

        if (requestSeq !== previewRequestSeqRef.current) return

        if (!res.ok || !body || !("totalCents" in body)) {
          setPricingPreview(null)
          setError(
            (body && "message" in body && body.message) ||
            (body && "error" in body && body.error) ||
            "We couldn't load checkout pricing.",
          )
          setIsLoadingPreview(false)
          return
        }

        setPricingPreview(body)
        setError(null)
        setIsLoadingPreview(false)
      } catch {
        if (requestSeq !== previewRequestSeqRef.current) return

        setPricingPreview(null)
        setError("We couldn't load checkout pricing.")
        setIsLoadingPreview(false)
      }
    },
    [holdId, isAuthenticated, selectedRegionCode, selectedShippingMode],
  )

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

        if (body.shippingAddress) {
          setShippingAddress(body.shippingAddress)
          setAddressSaved(true)
        }
      } catch {
        // best effort only
      }
    })()
  }, [holdId])

  useEffect(() => {
    if (!holdId) return
    const timer = window.setTimeout(() => void loadPricingPreview(), 0)
    return () => window.clearTimeout(timer)
  }, [holdId, loadPricingPreview])

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
          if (res.status === 404 || res.status === 409 || res.status === 410) {
            setError("Your checkout hold expired. Return to checkout to start again.")
            return
          }

          setError("We couldn’t verify your checkout reservation. Retrying automatically.")
          return
        }

        const data = (await res.json()) as CheckoutHeartbeatResponse

        setError(null)
        setExpiresAt(data.expiresAt)
        setCanExtend(Boolean(data.canExtend))
        setExtensionCount(data.extensionCount ?? 0)
        setMaxExtensions(data.maxExtensions ?? 0)
      } catch {
        setError("We couldn’t verify your checkout reservation. Retrying automatically.")
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

  async function handleSaveAddress(addr: ShippingAddressDto) {
    if (!holdId || isSavingAddress) return

    setIsSavingAddress(true)
    setAddressError(null)

    try {
      const res = await fetch("/api/bff/checkout/shipping-address", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          holdId,
          fullName: addr.fullName,
          addressLine1: addr.addressLine1,
          addressLine2: addr.addressLine2 ?? null,
          city: addr.city,
          stateOrProvince: addr.stateOrProvince,
          postalCode: addr.postalCode,
          countryCode: addr.countryCode,
        }),
        cache: "no-store",
      })

      const body = (await res.json().catch(() => null)) as
        | { holdId: string; shippingAddress: ShippingAddressDto }
        | { message?: string; error?: string }
        | null

      if (!res.ok || !body || !("shippingAddress" in body)) {
        setAddressError(
          (body && "message" in body && body.message) ||
          (body && "error" in body && body.error) ||
          "We couldn't save your shipping address.",
        )
        setIsSavingAddress(false)
        return
      }

      setShippingAddress(body.shippingAddress)
      setAddressSaved(true)
      setAddressError(null)
      setIsSavingAddress(false)
    } catch {
      setAddressError("We couldn't save your shipping address.")
      setIsSavingAddress(false)
    }
  }

  async function handleStartPayment() {
    if (!holdId || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const payload = {
        holdId,
        provider: selectedProvider,
        shippingMode: isAuthenticated ? selectedShippingMode : "SHIP_NOW",
        selectedRegionCode: isAuthenticated
          ? selectedShippingMode === "SHIP_NOW"
            ? selectedRegionCode
            : null
          : selectedRegionCode,
      }

      if (typeof window !== "undefined") {
        const raw = window.sessionStorage.getItem(CHECKOUT_HOLD_STORAGE_KEY)
        const parsed = raw && raw.length > 0 ? (JSON.parse(raw) as Record<string, unknown>) : {}

        window.sessionStorage.setItem(
          CHECKOUT_HOLD_STORAGE_KEY,
          JSON.stringify({
            ...parsed,
            holdId,
            selectedRegionCode: payload.selectedRegionCode ?? "US",
          }),
        )
      }

      const res = await fetch("/api/bff/payments-initiate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
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

  function persistSelectedRegion(next: ShippingRegionCode) {
    if (typeof window === "undefined") return

    const raw = window.sessionStorage.getItem(CHECKOUT_HOLD_STORAGE_KEY)
    const parsed = raw && raw.length > 0 ? (JSON.parse(raw) as Record<string, unknown>) : {}

    window.sessionStorage.setItem(
      CHECKOUT_HOLD_STORAGE_KEY,
      JSON.stringify({
        ...parsed,
        holdId,
        selectedRegionCode: next,
      }),
    )
  }

  if (!holdId) {
    return (
      <section
        className="rounded-[2rem] border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel-muted)] p-5 shadow-sm sm:p-6"
        data-testid="checkout-pay-missing-hold"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Payment
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
          A checkout hold is required before payment can begin
        </h1>
        <p className="mt-2 text-sm leading-6 mk-muted-text">
          Start checkout first so inventory is safely reserved before payment is initiated.
        </p>
        <Link
          href="/checkout"
          className="mk-cta mt-5 inline-flex rounded-2xl px-5 py-2.5 text-sm font-semibold"
          data-testid="checkout-pay-return-to-checkout"
        >
          Return to checkout
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Payment
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
          Choose payment and shipping preference
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 mk-muted-text sm:text-base">
          Payment can only start from an active checkout hold. Final paid status is confirmed by
          backend webhook processing, not redirect parameters.
        </p>
      </section>

      <section className="mk-glass-strong space-y-6 rounded-[2rem] p-5 sm:p-6">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <DetailItem label="Checkout hold ID" testId="checkout-pay-hold-id">
            {holdId}
          </DetailItem>
          <DetailItem label="Selected provider" testId="checkout-pay-provider">
            {selectedProvider}
          </DetailItem>
          <DetailItem label="Reservation expires in" testId="checkout-pay-countdown">
            {countdownLabel ?? "—"}
          </DetailItem>
          <DetailItem label="Extensions used" testId="checkout-pay-extension-count">
            {extensionCount} / {maxExtensions}
          </DetailItem>
        </dl>

        {canExtend ? (
          <button
            type="button"
            onClick={() => void handleExtendReservation()}
            disabled={isExtending}
            className={secondaryButtonClass}
            data-testid="checkout-pay-extend-reservation"
          >
            {isExtending ? "Extending..." : "Extend reservation"}
          </button>
        ) : null}

        {extensionMessage ? (
          <Alert tone="success" testId="checkout-pay-extension-message">
            {extensionMessage}
          </Alert>
        ) : null}

        {error ? (
          <Alert tone="danger" testId="checkout-pay-error">
            {error}
          </Alert>
        ) : null}
      </section>

      {initialCart ? (
        <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-6" data-testid="checkout-pay-summary-card">
          <div className="flex gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)]">
              {firstLine?.primaryImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={firstLine.primaryImageUrl}
                  alt={firstLine.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs mk-muted-text">
                  No image
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--mk-gold)]">
                Store payment
              </p>
              <h2
                className="mt-1 text-lg font-semibold text-[color:var(--mk-ink)]"
                data-testid="checkout-pay-summary-title"
              >
                {paymentTitle}
              </h2>
              <p className="mt-1 text-sm mk-muted-text" data-testid="checkout-pay-summary-context">
                {paymentContext}
              </p>
              <p className="mt-2 text-sm mk-muted-text" data-testid="checkout-pay-summary-line-count">
                {lineCount} item{lineCount === 1 ? "" : "s"} in cart
              </p>
            </div>
          </div>

          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
            <DetailItem label="Subtotal" testId="checkout-pay-summary-subtotal">
              {subtotalLabel ?? "—"}
            </DetailItem>

            <DetailItem label="Selected region" testId="checkout-pay-summary-region">
              {formatShippingRegionLabel(selectedRegionCode)}
            </DetailItem>

            <DetailItem label="Estimated total" testId="checkout-pay-summary-total">
              {formatMoney(pricingPreview?.totalCents ?? initialCart?.subtotalCents ?? null) ?? "—"}
            </DetailItem>
          </dl>
        </section>
      ) : null}

      <section className="mk-glass-strong space-y-6 rounded-[2rem] p-5 sm:p-6">
        {isAuthenticated ? (
          <>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-[color:var(--mk-ink)]">
                Shipping preference
              </legend>

              <ChoiceCard
                checked={selectedShippingMode === "SHIP_NOW"}
                title="Ship now"
                description="Complete this purchase for normal shipment now."
              >
                <input
                  type="radio"
                  name="shipping-mode"
                  value="SHIP_NOW"
                  checked={selectedShippingMode === "SHIP_NOW"}
                  onChange={() => {
                    setSelectedShippingMode("SHIP_NOW")
                    void loadPricingPreview("SHIP_NOW", selectedRegionCode)
                  }}
                  className="mt-1 accent-[color:var(--mk-amethyst)]"
                  data-testid="checkout-pay-shipping-ship-now"
                />
              </ChoiceCard>

              <ChoiceCard
                checked={selectedShippingMode === "OPEN_BOX"}
                title="Add to Open Box"
                description="Keep this order with your Open Box so it can be grouped with other eligible purchases."
              >
                <input
                  type="radio"
                  name="shipping-mode"
                  value="OPEN_BOX"
                  checked={selectedShippingMode === "OPEN_BOX"}
                  onChange={() => {
                    setSelectedShippingMode("OPEN_BOX")
                    void loadPricingPreview("OPEN_BOX")
                  }}
                  className="mt-1 accent-[color:var(--mk-amethyst)]"
                  data-testid="checkout-pay-shipping-open-box"
                />
              </ChoiceCard>
            </fieldset>

            {selectedShippingMode === "SHIP_NOW" ? (
              <ShippingRegionAndTotals
                selectedRegionCode={selectedRegionCode}
                pricingPreview={pricingPreview}
                initialSubtotalCents={initialCart?.subtotalCents ?? null}
                isLoadingPreview={isLoadingPreview}
                onRegionChange={(next) => {
                  setSelectedRegionCode(next)
                  persistSelectedRegion(next)
                  void loadPricingPreview("SHIP_NOW", next)
                }}
              />
            ) : (
              <OpenBoxTotals
                pricingPreview={pricingPreview}
                initialSubtotalCents={initialCart?.subtotalCents ?? null}
                isLoadingPreview={isLoadingPreview}
              />
            )}
          </>
        ) : (
          <>
            <div
              className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm mk-muted-text"
              data-testid="checkout-pay-guest-shipping-mode"
            >
              Guest checkout always uses normal shipment.
            </div>

            <ShippingRegionAndTotals
              selectedRegionCode={selectedRegionCode}
              pricingPreview={pricingPreview}
              initialSubtotalCents={initialCart?.subtotalCents ?? null}
              isLoadingPreview={isLoadingPreview}
              onRegionChange={(next) => {
                setSelectedRegionCode(next)
                persistSelectedRegion(next)
                void loadPricingPreview("SHIP_NOW", next)
              }}
            />
          </>
        )}
      </section>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-stone-900">Payment method</legend>

        <label className="flex items-center gap-3 rounded-xl border border-stone-200 p-4">
          ...
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-stone-200 p-4">
          ...
        </label>
      </fieldset>

      <section
        className="mk-glass-strong space-y-4 rounded-[2rem] p-5 sm:p-6"
        data-testid="checkout-pay-shipping-address-section"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              Shipping address
            </p>
            {addressSaved && shippingAddress ? (
              <p className="mt-1 text-sm mk-muted-text" data-testid="checkout-pay-address-summary">
                {shippingAddress.fullName} · {shippingAddress.addressLine1},{" "}
                {shippingAddress.city}, {shippingAddress.stateOrProvince}{" "}
                {shippingAddress.postalCode} · {shippingAddress.countryCode}
              </p>
            ) : null}
          </div>
          {addressSaved ? (
            <button
              type="button"
              onClick={() => setAddressSaved(false)}
              className="shrink-0 text-xs font-semibold mk-muted-text underline underline-offset-4 hover:text-[color:var(--mk-ink)]"
              data-testid="checkout-pay-edit-address"
            >
              Edit
            </button>
          ) : null}
        </div>

        {!addressSaved ? (
          <ShippingAddressForm
            initialValues={shippingAddress}
            onSave={handleSaveAddress}
            isSaving={isSavingAddress}
            error={addressError}
          />
        ) : null}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleStartPayment}
          disabled={isSubmitting || isLoadingPreview || !addressSaved}
          className="mk-cta inline-flex min-h-12 items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-56"
          data-testid="checkout-pay-start"
        >
          {isSubmitting ? "Redirecting…" : "Continue to provider"}
        </button>

        <Link
          href="/checkout"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-5 py-3 text-sm font-semibold text-[color:var(--mk-ink)] shadow-sm transition hover:bg-[color:var(--mk-panel-muted)] sm:min-w-48"
          data-testid="checkout-pay-return-to-checkout"
        >
          Return to checkout
        </Link>
      </div>
    </section>
  )
}

function DetailItem({
  label,
  testId,
  children,
}: {
  label: string
  testId: string
  children: ReactNode
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
        {children}
      </dd>
    </div>
  )
}

function ChoiceCard({
  checked,
  title,
  description,
  children,
}: {
  checked: boolean
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <label
      className={[
        "flex items-start gap-3 rounded-2xl border p-4 transition",
        checked
          ? "border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel-muted)]"
          : "border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] hover:bg-[color:var(--mk-panel-muted)]",
      ].join(" ")}
    >
      {children}
      <span className="text-sm">
        <span className="block font-semibold text-[color:var(--mk-ink)]">{title}</span>
        <span className="block leading-6 mk-muted-text">{description}</span>
      </span>
    </label>
  )
}

function ShippingRegionAndTotals({
  selectedRegionCode,
  pricingPreview,
  initialSubtotalCents,
  isLoadingPreview,
  onRegionChange,
}: {
  selectedRegionCode: ShippingRegionCode
  pricingPreview: CheckoutPricingPreviewResponse | null
  initialSubtotalCents: number | null
  isLoadingPreview: boolean
  onRegionChange: (next: ShippingRegionCode) => void
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-[color:var(--mk-ink)]">Shipping region</legend>

      <div className="sm:w-72">
        <label htmlFor="checkout-pay-region-select" className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
          Region
        </label>
        <select
          id="checkout-pay-region-select"
          data-testid="checkout-pay-region-select"
          value={selectedRegionCode}
          onChange={(e) => onRegionChange(e.currentTarget.value as ShippingRegionCode)}
          className={inputClass}
        >
          {SHIPPING_REGION_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <TotalsCard
        testId="checkout-pay-region-summary"
        selectedRegionCode={selectedRegionCode}
        subtotalCents={pricingPreview?.subtotalCents ?? initialSubtotalCents}
        shippingCents={pricingPreview?.shippingAmountCents ?? null}
        totalCents={pricingPreview?.totalCents ?? initialSubtotalCents}
        isLoadingPreview={isLoadingPreview}
        shippingLabel="Shipping"
        totalLabel="Total"
      />
    </fieldset>
  )
}

function OpenBoxTotals({
  pricingPreview,
  initialSubtotalCents,
  isLoadingPreview,
}: {
  pricingPreview: CheckoutPricingPreviewResponse | null
  initialSubtotalCents: number | null
  isLoadingPreview: boolean
}) {
  return (
    <div
      className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
      data-testid="checkout-pay-open-box-summary"
    >
      <p className="text-sm mk-muted-text">
        <span className="font-semibold text-[color:var(--mk-ink)]">Open Box selected:</span>{" "}
        shipping will be billed later when your combined shipment is ready.
      </p>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 mk-muted-text">
          <dt>Subtotal</dt>
          <dd className="text-right tabular-nums" data-testid="checkout-pay-open-box-subtotal">
            {formatMoney(pricingPreview?.subtotalCents ?? initialSubtotalCents) ?? "—"}
          </dd>
        </div>

        <div className="grid grid-cols-[1fr_auto] items-center gap-4 mk-muted-text">
          <dt>Shipping now</dt>
          <dd className="text-right tabular-nums" data-testid="checkout-pay-open-box-shipping">
            {isLoadingPreview ? "Loading..." : formatMoney(pricingPreview?.shippingAmountCents ?? 0) ?? "$0.00"}
          </dd>
        </div>

        <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-[color:var(--mk-border)] pt-2 font-semibold text-[color:var(--mk-ink)]">
          <dt>Total due now</dt>
          <dd className="text-right tabular-nums" data-testid="checkout-pay-open-box-total">
            {isLoadingPreview ? "Loading..." : formatMoney(pricingPreview?.totalCents ?? initialSubtotalCents) ?? "—"}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function TotalsCard({
  testId,
  selectedRegionCode,
  subtotalCents,
  shippingCents,
  totalCents,
  isLoadingPreview,
  shippingLabel,
  totalLabel,
}: {
  testId: string
  selectedRegionCode: ShippingRegionCode
  subtotalCents?: number | null
  shippingCents?: number | null
  totalCents?: number | null
  isLoadingPreview: boolean
  shippingLabel: string
  totalLabel: string
}) {
  return (
    <div
      className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
      data-testid={testId}
    >
      <p className="text-sm mk-muted-text">
        <span className="font-semibold text-[color:var(--mk-ink)]">Selected region:</span>{" "}
        <span data-testid="checkout-pay-region-label">
          {formatShippingRegionLabel(selectedRegionCode)}
        </span>
      </p>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 mk-muted-text">
          <dt>Subtotal</dt>
          <dd className="text-right tabular-nums" data-testid="checkout-pay-preview-subtotal">
            {formatMoney(subtotalCents) ?? "—"}
          </dd>
        </div>

        <div className="grid grid-cols-[1fr_auto] items-center gap-4 mk-muted-text">
          <dt>{shippingLabel}</dt>
          <dd className="text-right tabular-nums" data-testid="checkout-pay-preview-shipping">
            {isLoadingPreview ? "Loading..." : formatMoney(shippingCents) ?? "—"}
          </dd>
        </div>

        <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-[color:var(--mk-border)] pt-2 font-semibold text-[color:var(--mk-ink)]">
          <dt>{totalLabel}</dt>
          <dd className="text-right tabular-nums" data-testid="checkout-pay-preview-total">
            {isLoadingPreview ? "Loading..." : formatMoney(totalCents) ?? "—"}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function Alert({
  tone,
  testId,
  children,
}: {
  tone: "success" | "danger"
  testId: string
  children: ReactNode
}) {
  const toneClass =
    tone === "success"
      ? "border-[color:var(--mk-success)]/40 text-[color:var(--mk-success)]"
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