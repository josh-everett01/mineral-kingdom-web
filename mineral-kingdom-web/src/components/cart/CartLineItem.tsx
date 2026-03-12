import Link from "next/link"
import { formatMoney, type CartLineDto } from "@/lib/cart/cartTypes"
import { removeCartLineAction } from "@/app/cart/actions"

type Props = {
  line: CartLineDto
}

export function CartLineItem({ line }: Props) {
  return (
    <article
      className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[120px_1fr_auto]"
      data-testid="cart-line"
    >
      <Link
        href={line.listingHref}
        className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
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
            <div className="flex h-full items-center justify-center text-sm text-stone-500">
              No image
            </div>
          )}
        </div>
      </Link>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-stone-900" data-testid="cart-line-title">
          <Link href={line.listingHref}>{line.title}</Link>
        </h2>

        <div className="space-y-1 text-sm text-stone-600">
          <p data-testid="cart-line-quantity">Quantity: {line.quantity}</p>
          <p data-testid="cart-line-unit-price">
            Price: {formatMoney(line.effectivePriceCents) ?? "—"}
            {line.effectivePriceCents < line.priceCents ? (
              <span className="ml-2 text-stone-500 line-through">
                {formatMoney(line.priceCents)}
              </span>
            ) : null}
          </p>
        </div>

        {!line.canUpdateQuantity ? (
          <p className="text-xs text-stone-500" data-testid="cart-line-quantity-note">
            This specimen is a unique item and quantity is fixed at 1.
          </p>
        ) : null}
      </div>

      <div className="flex items-start justify-end">
        <form action={removeCartLineAction}>
          <input type="hidden" name="offerId" value={line.offerId} />
          <button
            type="submit"
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
            data-testid="cart-remove-button"
          >
            Remove
          </button>
        </form>
      </div>
    </article>
  )
}