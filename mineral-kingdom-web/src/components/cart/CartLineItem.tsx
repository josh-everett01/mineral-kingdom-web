import Link from "next/link"
import { Gem, Trash2 } from "lucide-react"

import { removeCartLineAction } from "@/app/cart/actions"
import { type CartLineDto } from "@/lib/cart/cartTypes"
import { formatCurrency } from "@/lib/format/currency"

type Props = {
  line: CartLineDto
}

export function CartLineItem({ line }: Props) {
  const hasDiscount = line.effectivePriceCents < line.priceCents

  return (
    <article
      className="mk-glass grid gap-4 rounded-[2rem] p-4 transition duration-300 hover:-translate-y-0.5 sm:grid-cols-[128px_1fr_auto]"
      data-testid="cart-line"
    >
      <Link
        href={line.listingHref}
        className="overflow-hidden rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)]"
      >
        <div className="aspect-square">
          {line.primaryImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={line.primaryImageUrl}
              alt={line.title}
              className="h-full w-full object-cover transition duration-500 hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm mk-muted-text">
              <Gem className="mr-2 h-5 w-5 text-[color:var(--mk-gold)]" />
              No image
            </div>
          )}
        </div>
      </Link>

      <div className="min-w-0 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--mk-gold)]">
            Available Now
          </p>

          <h2
            className="mt-1 line-clamp-2 text-lg font-semibold text-[color:var(--mk-ink)]"
            data-testid="cart-line-title"
          >
            <Link href={line.listingHref} className="hover:underline">
              {line.title}
            </Link>
          </h2>
        </div>

        <div className="grid gap-2 text-sm mk-muted-text sm:grid-cols-2">
          <p data-testid="cart-line-quantity">Quantity: {line.quantity}</p>

          <p data-testid="cart-line-unit-price">
            Price:{" "}
            <span className="font-semibold text-[color:var(--mk-ink)]">
              {formatCurrency(line.effectivePriceCents) ?? "—"}
            </span>
            {hasDiscount ? (
              <span className="ml-2 line-through">
                {formatCurrency(line.priceCents)}
              </span>
            ) : null}
          </p>
        </div>

        {!line.canUpdateQuantity ? (
          <p
            className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-3 py-2 text-xs leading-5 mk-muted-text"
            data-testid="cart-line-quantity-note"
          >
            This specimen is a unique item and quantity is fixed at 1.
          </p>
        ) : null}
      </div>

      <div className="flex items-start justify-end">
        <form action={removeCartLineAction}>
          <input type="hidden" name="offerId" value={line.offerId} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] shadow-sm transition hover:bg-[color:var(--mk-panel-muted)]"
            data-testid="cart-remove-button"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        </form>
      </div>
    </article>
  )
}