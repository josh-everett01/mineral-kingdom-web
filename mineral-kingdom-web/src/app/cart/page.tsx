import Link from "next/link"
import { CartLineItem } from "@/components/cart/CartLineItem"
import { formatMoney } from "@/lib/cart/cartTypes"
import { fetchCart } from "@/lib/cart/getCart"

export default async function CartPage() {
  const cart = await fetchCart()

  if (!cart) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"
          data-testid="cart-error-state"
        >
          We couldn&apos;t load your cart right now.
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8" data-testid="cart-page">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Cart
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Your cart</h1>
        <p className="max-w-2xl text-sm text-stone-600 sm:text-base">
          Review the items you plan to purchase before continuing to checkout.
        </p>
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

      {cart.lines.length === 0 ? (
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

          <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" data-testid="cart-summary">
            <h2 className="text-lg font-semibold text-stone-900">Summary</h2>

            <dl className="mt-4 space-y-3 text-sm text-stone-700">
              <div className="flex items-center justify-between gap-3">
                <dt>Items</dt>
                <dd>{cart.lines.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-3 text-base font-semibold text-stone-900">
                <dt>Subtotal</dt>
                <dd data-testid="cart-subtotal">{formatMoney(cart.subtotalCents) ?? "—"}</dd>
              </div>
            </dl>

            <button
              type="button"
              className="mt-6 w-full rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white opacity-60"
              disabled
              data-testid="cart-checkout-button"
            >
              Checkout coming next
            </button>
          </aside>
        </section>
      )}
    </main>
  )
}