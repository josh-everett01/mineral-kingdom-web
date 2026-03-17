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
          className="inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="listing-add-to-cart"
        >
          {isSubmitting === "cart" ? "Adding…" : "Add to Cart"}
        </button>

        <button
          type="button"
          onClick={() => void addItemToCart("buy-now")}
          disabled={isSubmitting !== null}
          className="inline-flex rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-medium text-emerald-950 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="listing-buy-now"
        >
          {isSubmitting === "buy-now" ? "Starting checkout…" : "Buy Now"}
        </button>
      </div>

      <p className="text-xs text-stone-500" data-testid="listing-purchase-note">
        Items are not reserved until checkout begins.
      </p>

      {successMessage ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          data-testid="listing-add-to-cart-success"
        >
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          data-testid="listing-add-to-cart-error"
        >
          {errorMessage}
        </div>
      ) : null}
    </div>
  )
}