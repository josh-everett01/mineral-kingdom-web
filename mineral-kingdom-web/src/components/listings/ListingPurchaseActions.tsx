"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Props = {
  offerId: string
}

type CartResponse = {
  cartId: string
  lines: Array<{
    offerId: string
    quantity: number
  }>
}

type ErrorResponse = {
  message?: string
  error?: string
}

export function ListingPurchaseActions({ offerId }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState<"cart" | "buy-now" | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function addItemToCart(nextAction: "cart" | "buy-now") {
    if (isSubmitting) return

    setIsSubmitting(nextAction)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const res = await fetch("/api/bff/cart", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          offerId,
          quantity: 1,
        }),
      })

      const body = (await res.json().catch(() => null)) as CartResponse | ErrorResponse | null

      if (!res.ok) {
        setErrorMessage(
          (body && "message" in body && body.message) ||
          (body && "error" in body && body.error) ||
          "We couldn't update your cart.",
        )
        setIsSubmitting(null)
        return
      }

      router.refresh()

      if (nextAction === "buy-now") {
        router.push("/checkout")
        return
      }

      setSuccessMessage("Added to cart. Items are not reserved until checkout begins.")
      setIsSubmitting(null)
    } catch {
      setErrorMessage("We couldn't update your cart.")
      setIsSubmitting(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void addItemToCart("cart")}
          disabled={isSubmitting !== null}
          className="mk-cta inline-flex rounded-2xl px-5 py-2.5 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="listing-add-to-cart"
        >
          {isSubmitting === "cart" ? "Adding…" : "Add to Cart"}
        </button>

        <button
          type="button"
          onClick={() => void addItemToCart("buy-now")}
          disabled={isSubmitting !== null}
          className="inline-flex rounded-2xl border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel)] px-5 py-2.5 text-sm font-semibold text-[color:var(--mk-ink)] shadow-sm transition hover:scale-[1.01] hover:bg-[color:var(--mk-panel-muted)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="listing-buy-now"
        >
          {isSubmitting === "buy-now" ? "Starting checkout…" : "Buy Now"}
        </button>
      </div>

      <p className="text-xs mk-muted-text" data-testid="listing-purchase-note">
        Items are not reserved until checkout begins.
      </p>

      {successMessage ? (
        <div
          className="rounded-2xl border border-[color:var(--mk-success)]/40 bg-[color:var(--mk-panel-muted)] p-3 text-sm text-[color:var(--mk-success)]"
          data-testid="listing-add-to-cart-success"
        >
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          className="rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-3 text-sm text-[color:var(--mk-danger)]"
          data-testid="listing-add-to-cart-error"
        >
          {errorMessage}
        </div>
      ) : null}
    </div>
  )
}