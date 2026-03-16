"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

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

const STORAGE_KEY = "mk_checkout_payment_id"

export function CheckoutReturnClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [paymentId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return window.sessionStorage.getItem(STORAGE_KEY)
  })
  const [state, setState] = useState<PaymentConfirmationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cancelled = useMemo(() => searchParams.get("cancelled") === "1", [searchParams])

  useEffect(() => {
    if (!paymentId || cancelled) return

    const confirmedPaymentId = paymentId
    let cancelledEffect = false
    let intervalId: number | null = null

    async function poll() {
      try {
        const res = await fetch(`/api/bff/payments/${confirmedPaymentId}/confirmation`, {
          cache: "no-store",
        })

        const body = (await res.json().catch(() => null)) as
          | PaymentConfirmationResponse
          | { message?: string; error?: string }
          | null

        if (!res.ok || !body || !("paymentId" in body)) {
          if (!cancelledEffect) {
            setError(
              (body && "message" in body && body.message) ||
              (body && "error" in body && body.error) ||
              "We couldn't verify payment yet.",
            )
          }
          return
        }

        if (cancelledEffect) return

        setState(body)
        setError(null)

        if (body.isConfirmed && body.orderId) {
          window.sessionStorage.setItem(`mk_order_payment_${body.orderId}`, confirmedPaymentId)
          router.replace(
            `/orders/${body.orderId}/confirmation?paymentId=${encodeURIComponent(confirmedPaymentId)}`,
          )
        }
      } catch {
        if (!cancelledEffect) {
          setError("We couldn't verify payment yet.")
        }
      }
    }

    void poll()
    intervalId = window.setInterval(() => {
      void poll()
    }, 2500)

    return () => {
      cancelledEffect = true
      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }
    }
  }, [cancelled, paymentId, router])

  return (
    <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
        Checkout Return
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-stone-900">
        We recorded your return from the payment provider
      </h1>

      <p className="text-sm text-stone-600 sm:text-base" data-testid="checkout-return-copy">
        Redirect parameters are never treated as proof of payment. This page waits for backend
        confirmation before showing final order state.
      </p>

      {cancelled ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          data-testid="checkout-return-cancelled"
        >
          Your payment flow was cancelled or interrupted. No paid status will be shown unless the
          backend later confirms it.
        </div>
      ) : null}

      {!paymentId ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          data-testid="checkout-return-missing-payment"
        >
          We could not find an active payment session to verify. Return to checkout and start
          payment again if needed.
        </div>
      ) : (
        <dl className="grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
          <div>
            <dt className="font-medium">Payment ID</dt>
            <dd data-testid="checkout-return-payment-id">{paymentId}</dd>
          </div>
          <div>
            <dt className="font-medium">Backend payment status</dt>
            <dd data-testid="checkout-return-payment-status">
              {state?.paymentStatus ?? "Waiting for confirmation…"}
            </dd>
          </div>
        </dl>
      )}

      {state?.orderNumber ? (
        <p className="text-sm text-stone-600" data-testid="checkout-return-order-number">
          Confirmed order number: {state.orderNumber}
        </p>
      ) : null}

      {error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          data-testid="checkout-return-error"
        >
          {error}
        </div>
      ) : null}
    </section>
  )
}