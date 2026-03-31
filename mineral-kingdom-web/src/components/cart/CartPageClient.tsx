"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { CartLineItem } from "@/components/cart/CartLineItem"
import { CartNoticeDismissButton } from "@/components/cart/CartNoticeDismissButton"
import { CartNoticesToastClient } from "@/components/cart/CartNoticesToastClient"
import { CartRealtimeClient } from "@/components/cart/CartRealtimeClient"
import { formatCurrency } from "@/lib/format/currency"
import type { CartDto } from "@/lib/cart/cartTypes"

type LoadableError = {
  status?: number
  message?: string
  error?: string
  code?: string
}

export function CartPageClient() {
  const [cart, setCart] = useState<CartDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadCart = useCallback(
    async (options?: { background?: boolean }) => {
      const background = options?.background ?? false

      if (background) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        const res = await fetch("/api/bff/cart", {
          method: "GET",
          cache: "no-store",
        })

        const body = (await res.json().catch(() => null)) as CartDto | LoadableError | null

        if (!res.ok || !body || !("cartId" in body)) {
          setError(
            (body && "message" in body && typeof body.message === "string" && body.message) ||
            (body && "error" in body && typeof body.error === "string" && body.error) ||
            "We couldn’t load your cart right now.",
          )
          setCart(null)
          return
        }

        setCart(body)
        setError(null)
      } catch {
        setError("We couldn’t load your cart right now.")
        setCart(null)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [],
  )

  useEffect(() => {
    void loadCart()
  }, [loadCart])

  const lineCount = useMemo(() => cart?.lines.length ?? 0, [cart])

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          className="rounded-2xl border border-stone-200 bg-white p-6 text-stone-700 shadow-sm"
          data-testid="cart-loading-state"
        >
          Loading your cart…
        </div>
      </main>
    )
  }

  if (error || !cart) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"
          data-testid="cart-error-state"
        >
          {error ?? "We couldn’t load your cart right now."}
        </div>
      </main>
    )
  }

  return (
    <main
      className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"
      data-testid="cart-page"
    >
      <CartRealtimeClient
        cartId={cart.cartId}
        onSnapshot={() => {
          void loadCart({ background: true })
        }}
      />
      <CartNoticesToastClient notices={cart.notices} />

      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">Cart</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">Your cart</h1>
            <p className="max-w-2xl text-sm text-stone-600 sm:text-base">
              Review the items you plan to purchase before continuing to checkout.
            </p>
          </div>

          {isRefreshing ? (
            <p className="text-xs font-medium text-stone-500" data-testid="cart-refreshing-indicator">
              Refreshing…
            </p>
          ) : null}
        </div>
      </section>

      {cart.warnings.length > 0 ? (
        <section
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm"
          data-testid="cart-warning-banner"
        >
          <ul className="space-y-1 text-sm">
            {cart.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {cart.notices.length > 0 ? (
        <section
          className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm"
          data-testid="cart-notices"
        >
          {cart.notices.map((notice) => (
            <div
              key={notice.id}
              className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
              data-testid="cart-notice"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                  Cart update
                </p>
                <p className="text-sm text-amber-950" data-testid="cart-notice-message">
                  {notice.message}
                </p>
              </div>

              <CartNoticeDismissButton noticeId={notice.id} />
            </div>
          ))}
        </section>
      ) : null}

      {lineCount === 0 ? (
        <section
          className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm"
          data-testid="cart-empty-state"
        >
          <h2 className="text-lg font-semibold text-stone-900">Your cart is empty</h2>
          <p className="mt-2 text-sm text-stone-600">
            Browse available specimens and add something to get started.
          </p>
          <Link
            href="/shop"
            className="mt-4 inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
          >
            Continue shopping
          </Link>
        </section>
      ) : (
        <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4" data-testid="cart-lines">
            {cart.lines.map((line) => (
              <CartLineItem key={line.offerId} line={line} />
            ))}
          </div>

          <aside
            className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            data-testid="cart-summary"
          >
            <h2 className="text-lg font-semibold text-stone-900">Summary</h2>

            <dl className="mt-4 space-y-3 text-sm text-stone-700">
              <div className="flex items-center justify-between gap-3">
                <dt>Items</dt>
                <dd>{lineCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-3 text-base font-semibold text-stone-900">
                <dt>Subtotal</dt>
                <dd data-testid="cart-subtotal">
                  {formatCurrency(cart.subtotalCents) ?? "—"}
                </dd>
              </div>
            </dl>

            <Link
              href="/checkout"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
              data-testid="cart-checkout-link"
            >
              Proceed to checkout
            </Link>
          </aside>
        </section>
      )}
    </main>
  )
}