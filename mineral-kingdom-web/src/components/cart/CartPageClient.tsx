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

  const handleRealtimeSnapshot = useCallback(() => {
    void loadCart({ background: true })
  }, [loadCart])

  const lineCount = useMemo(() => cart?.lines.length ?? 0, [cart])

  if (isLoading) {
    return (
      <main className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
        <div
          className="mk-glass-strong mx-auto max-w-6xl rounded-[2rem] p-6 mk-muted-text"
          data-testid="cart-loading-state"
        >
          Loading your cart…
        </div>
      </main>
    )
  }

  if (error || !cart) {
    return (
      <main className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
        <div
          className="mx-auto max-w-6xl rounded-[2rem] border border-[color:var(--mk-danger)] bg-[color:var(--mk-panel-muted)] p-6 text-[color:var(--mk-danger)] shadow-sm"
          data-testid="cart-error-state"
        >
          {error ?? "We couldn’t load your cart right now."}
        </div>
      </main>
    )
  }

  return (
    <main
      className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
      data-testid="cart-page"
    >
      <div className="mx-auto max-w-6xl space-y-8">
        <CartRealtimeClient cartId={cart.cartId} onSnapshot={handleRealtimeSnapshot} />
        <CartNoticesToastClient notices={cart.notices} />

        <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
            Cart
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
                Your cart
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 mk-muted-text sm:text-base">
                Review the items you plan to purchase before continuing to checkout.
              </p>
            </div>

            {isRefreshing ? (
              <p
                className="text-xs font-semibold text-[color:var(--mk-gold)]"
                data-testid="cart-refreshing-indicator"
              >
                Refreshing…
              </p>
            ) : null}
          </div>
        </section>

        {cart.warnings.length > 0 ? (
          <section
            className="rounded-[2rem] border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel-muted)] p-4 text-[color:var(--mk-gold)] shadow-sm"
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
            className="space-y-3 rounded-[2rem] border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel-muted)] p-4 text-[color:var(--mk-ink)] shadow-sm"
            data-testid="cart-notices"
          >
            {cart.notices.map((notice) => (
              <div
                key={notice.id}
                className="flex flex-col gap-3 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] p-4 sm:flex-row sm:items-start sm:justify-between"
                data-testid="cart-notice"
              >
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--mk-gold)]">
                    Cart update
                  </p>
                  <p className="text-sm mk-muted-text" data-testid="cart-notice-message">
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
            className="mk-glass-strong rounded-[2rem] p-8 text-center"
            data-testid="cart-empty-state"
          >
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              Your cart is empty
            </h2>
            <p className="mt-2 text-sm mk-muted-text">
              Browse available specimens and add something to get started.
            </p>
            <Link
              href="/shop"
              className="mk-cta mt-5 inline-flex rounded-2xl px-5 py-2.5 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99]"
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
              className="mk-glass-strong h-fit rounded-[2rem] p-5"
              data-testid="cart-summary"
            >
              <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Summary</h2>

              <dl className="mt-4 space-y-3 text-sm mk-muted-text">
                <div className="flex items-center justify-between gap-3">
                  <dt>Items</dt>
                  <dd>{lineCount}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[color:var(--mk-border)] pt-3 text-base font-semibold text-[color:var(--mk-ink)]">
                  <dt>Subtotal</dt>
                  <dd data-testid="cart-subtotal">
                    {formatCurrency(cart.subtotalCents) ?? "—"}
                  </dd>
                </div>
              </dl>

              <Link
                href="/checkout"
                className="mk-cta mt-6 inline-flex w-full items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99]"
                data-testid="cart-checkout-link"
              >
                Proceed to checkout
              </Link>
            </aside>
          </section>
        )}
      </div>
    </main>
  )
}