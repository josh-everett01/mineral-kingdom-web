import Link from "next/link"

import { removeCartLineAction } from "@/app/cart/actions"
import { type CartLineDto } from "@/lib/cart/cartTypes"
import { formatCurrency } from "@/lib/format/currency"

type Props = {
  line: CartLineDto
}

export function CartLineItem({ line }: Props) {
  return (
    <article
      className="mk-glass grid gap-4 rounded-[2rem] p-4 sm:grid-cols-[120px_1fr_auto]"
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
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm mk-muted-text">
              No image
            </div>
          )}
        </div>
      </Link>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]" data-testid="cart-line-title">
          <Link href={line.listingHref} className="hover:underline">
            {line.title}
          </Link>
        </h2>

        <div className="space-y-1 text-sm mk-muted-text">
          <p data-testid="cart-line-quantity">Quantity: {line.quantity}</p>
          <p data-testid="cart-line-unit-price">
            Price: {formatCurrency(line.effectivePriceCents) ?? "—"}
            {line.effectivePriceCents < line.priceCents ? (
              <span className="ml-2 line-through">
                {formatCurrency(line.priceCents)}
              </span>
            ) : null}
          </p>
        </div>

        {!line.canUpdateQuantity ? (
          <p className="text-xs mk-muted-text" data-testid="cart-line-quantity-note">
            This specimen is a unique item and quantity is fixed at 1.
          </p>
        ) : null}
      </div>

      <div className="flex items-start justify-end">
        <form action={removeCartLineAction}>
          <input type="hidden" name="offerId" value={line.offerId} />
          <button
            type="submit"
            className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] shadow-sm transition hover:bg-[color:var(--mk-panel-muted)]"
            data-testid="cart-remove-button"
          >
            Remove
          </button>
        </form>
      </div>
    </article>
  )
}