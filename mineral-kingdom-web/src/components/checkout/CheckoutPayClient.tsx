"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CartDto } from "@/lib/cart/cartTypes"
import {
  type ShippingRegionCode,
  SHIPPING_REGION_OPTIONS,
  formatShippingRegionLabel,
  isShippingRegionCode,
} from "@/components/shipping/shippingRegions"
import { ShippingAddressForm, type ShippingAddressDto } from "@/components/checkout/ShippingAddressForm"

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
  const [selectedProvider, setSelectedProvider] = useState<"stripe" | "paypal">("stripe")
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
      if (!holdId) {
        return
      }

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

        if (requestSeq !== previewRequestSeqRef.current) {

          return
        }

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

        if (requestSeq !== previewRequestSeqRef.current) {

          return
        }

        setPricingPreview(null)
        setError("We couldn't load checkout pricing.")
        setIsLoadingPreview(false)
      }
    },
    [holdId, isAuthenticated, selectedRegionCode, selectedShippingMode],
  )

  useEffect(() => {
  }, [selectedRegionCode])

  useEffect(() => {
  }, [selectedShippingMode])

  useEffect(() => {
  }, [pricingPreview])

  // selectedRegionCode is initialized from sessionStorage in useState above; no effect needed here.

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

      {initialCart ? (
        <section
          className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
          data-testid="checkout-pay-summary-card"
        >
          <div className="flex gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
              {firstLine?.primaryImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={firstLine.primaryImageUrl}
                  alt={firstLine.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-stone-500">
                  No image
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Store payment
              </p>
              <h2
                className="mt-1 text-lg font-semibold text-stone-900"
                data-testid="checkout-pay-summary-title"
              >
                {paymentTitle}
              </h2>
              <p
                className="mt-1 text-sm text-stone-600"
                data-testid="checkout-pay-summary-context"
              >
                {paymentContext}
              </p>
              <p
                className="mt-2 text-sm text-stone-700"
                data-testid="checkout-pay-summary-line-count"
              >
                {lineCount} item{lineCount === 1 ? "" : "s"} in cart
              </p>
            </div>
          </div>

          <dl className="mt-4 grid gap-3 text-sm text-stone-700 sm:grid-cols-3">
            <div>
              <dt className="font-medium text-stone-500">Subtotal</dt>
              <dd data-testid="checkout-pay-summary-subtotal">{subtotalLabel ?? "—"}</dd>
            </div>

            <div>
              <dt className="font-medium text-stone-500">Selected region</dt>
              <dd data-testid="checkout-pay-summary-region">
                {formatShippingRegionLabel(selectedRegionCode)}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-stone-500">Estimated total</dt>
              <dd data-testid="checkout-pay-summary-total">
                {formatMoney(pricingPreview?.totalCents ?? initialCart?.subtotalCents ?? null) ??
                  "—"}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {isAuthenticated ? (
        <>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-stone-900">Shipping preference</legend>

            <label className="flex items-start gap-3 rounded-xl border border-stone-200 p-4">
              <input
                type="radio"
                name="shipping-mode"
                value="SHIP_NOW"
                checked={selectedShippingMode === "SHIP_NOW"}
                onChange={() => {
                  setSelectedShippingMode("SHIP_NOW")
                  void loadPricingPreview("SHIP_NOW", selectedRegionCode)
                }}
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
                onChange={() => {
                  setSelectedShippingMode("OPEN_BOX")
                  void loadPricingPreview("OPEN_BOX")
                }}
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

          {selectedShippingMode === "SHIP_NOW" ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-stone-900">Shipping region</legend>

              <div className="sm:w-72">
                <label
                  htmlFor="checkout-pay-region-select"
                  className="mb-1 block text-sm font-medium text-stone-700"
                >
                  Region
                </label>
                <select
                  id="checkout-pay-region-select"
                  data-testid="checkout-pay-region-select"
                  value={selectedRegionCode}
                  onChange={(e) => {
                    const next = e.currentTarget.value as ShippingRegionCode
                    setSelectedRegionCode(next)
                    persistSelectedRegion(next)
                    void loadPricingPreview("SHIP_NOW", next)
                  }}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none"
                >
                  {SHIPPING_REGION_OPTIONS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="rounded-xl border border-stone-200 bg-stone-50 p-4"
                data-testid="checkout-pay-region-summary"
              >
                <p className="text-sm text-stone-700">
                  <span className="font-medium text-stone-900">Selected region:</span>{" "}
                  <span data-testid="checkout-pay-region-label">
                    {formatShippingRegionLabel(selectedRegionCode)}
                  </span>
                </p>

                <dl className="mt-3 space-y-2 text-sm text-stone-700">
                  <div className="flex items-center justify-between gap-3">
                    <dt>Subtotal</dt>
                    <dd data-testid="checkout-pay-preview-subtotal">
                      {formatMoney(
                        pricingPreview?.subtotalCents ?? initialCart?.subtotalCents ?? null,
                      ) ?? "—"}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <dt>Shipping</dt>
                    <dd data-testid="checkout-pay-preview-shipping">
                      {isLoadingPreview
                        ? "Loading..."
                        : formatMoney(pricingPreview?.shippingAmountCents ?? null) ?? "—"}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-2 font-semibold text-stone-900">
                    <dt>Total</dt>
                    <dd data-testid="checkout-pay-preview-total">
                      {isLoadingPreview
                        ? "Loading..."
                        : formatMoney(pricingPreview?.totalCents ?? null) ??
                        formatMoney(initialCart?.subtotalCents ?? null) ??
                        "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </fieldset>
          ) : (
            <div
              className="rounded-xl border border-stone-200 bg-stone-50 p-4"
              data-testid="checkout-pay-open-box-summary"
            >
              <p className="text-sm text-stone-700">
                <span className="font-medium text-stone-900">Open Box selected:</span> shipping
                will be billed later when your combined shipment is ready.
              </p>

              <dl className="mt-3 space-y-2 text-sm text-stone-700">
                <div className="flex items-center justify-between gap-3">
                  <dt>Subtotal</dt>
                  <dd data-testid="checkout-pay-open-box-subtotal">
                    {formatMoney(
                      pricingPreview?.subtotalCents ?? initialCart?.subtotalCents ?? null,
                    ) ?? "—"}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <dt>Shipping now</dt>
                  <dd data-testid="checkout-pay-open-box-shipping">
                    {isLoadingPreview
                      ? "Loading..."
                      : formatMoney(pricingPreview?.shippingAmountCents ?? 0) ?? "$0.00"}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-2 font-semibold text-stone-900">
                  <dt>Total due now</dt>
                  <dd data-testid="checkout-pay-open-box-total">
                    {isLoadingPreview
                      ? "Loading..."
                      : formatMoney(pricingPreview?.totalCents ?? initialCart?.subtotalCents ?? null) ??
                      "—"}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </>
      ) : (
        <>
          <div
            className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700"
            data-testid="checkout-pay-guest-shipping-mode"
          >
            Guest checkout always uses normal shipment.
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-stone-900">Shipping region</legend>

            <div className="sm:w-72">
              <label
                htmlFor="checkout-pay-region-select"
                className="mb-1 block text-sm font-medium text-stone-700"
              >
                Region
              </label>
              <select
                id="checkout-pay-region-select"
                data-testid="checkout-pay-region-select"
                value={selectedRegionCode}
                onChange={(e) => {
                  const next = e.currentTarget.value as ShippingRegionCode
                  setSelectedRegionCode(next)
                  persistSelectedRegion(next)
                  void loadPricingPreview("SHIP_NOW", next)
                }}
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none"
              >
                {SHIPPING_REGION_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="rounded-xl border border-stone-200 bg-stone-50 p-4"
              data-testid="checkout-pay-region-summary"
            >
              <p className="text-sm text-stone-700">
                <span className="font-medium text-stone-900">Selected region:</span>{" "}
                <span data-testid="checkout-pay-region-label">
                  {formatShippingRegionLabel(selectedRegionCode)}
                </span>
              </p>

              <dl className="mt-3 space-y-2 text-sm text-stone-700">
                <div className="flex items-center justify-between gap-3">
                  <dt>Subtotal</dt>
                  <dd data-testid="checkout-pay-preview-subtotal">
                    {formatMoney(
                      pricingPreview?.subtotalCents ?? initialCart?.subtotalCents ?? null,
                    ) ?? "—"}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <dt>Shipping</dt>
                  <dd data-testid="checkout-pay-preview-shipping">
                    {isLoadingPreview
                      ? "Loading..."
                      : formatMoney(pricingPreview?.shippingAmountCents ?? null) ?? "—"}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-2 font-semibold text-stone-900">
                  <dt>Total</dt>
                  <dd data-testid="checkout-pay-preview-total">
                    {isLoadingPreview
                      ? "Loading..."
                      : formatMoney(pricingPreview?.totalCents ?? null) ??
                      formatMoney(initialCart?.subtotalCents ?? null) ??
                      "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </fieldset>
        </>
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

      <section
        className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-5"
        data-testid="checkout-pay-shipping-address-section"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Shipping address
            </p>
            {addressSaved && shippingAddress ? (
              <p
                className="mt-1 text-sm text-stone-700"
                data-testid="checkout-pay-address-summary"
              >
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
              className="shrink-0 text-xs text-stone-500 underline hover:text-stone-700"
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

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleStartPayment}
          disabled={isSubmitting || isLoadingPreview || !addressSaved}
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