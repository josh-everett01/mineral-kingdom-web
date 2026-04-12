import Link from "next/link"
import { formatEndsAt, formatMoney, type ListingBrowseItemDto } from "@/lib/shop/getListings"

type Props = {
  item: ListingBrowseItemDto
}

function getStoreSavingsLabel(item: ListingBrowseItemDto): string | null {
  if (item.listingType === "AUCTION") return null

  if (
    typeof item.priceCents !== "number" ||
    typeof item.effectivePriceCents !== "number" ||
    item.effectivePriceCents >= item.priceCents
  ) {
    return null
  }

  if (item.discountType === "PERCENT" && typeof item.discountPercentBps === "number") {
    return `${(item.discountPercentBps / 100).toFixed(0)}% off`
  }

  const savingsCents = item.priceCents - item.effectivePriceCents
  if (savingsCents > 0) {
    return `Save ${formatMoney(savingsCents) ?? "—"}`
  }

  return null
}

export function ListingBrowseCard({ item }: Props) {
  const isAuction = item.listingType === "AUCTION"

  const displayPrice = isAuction
    ? formatMoney(item.currentBidCents)
    : formatMoney(item.effectivePriceCents ?? item.priceCents)

  const originalPrice =
    !isAuction &&
      typeof item.effectivePriceCents === "number" &&
      typeof item.priceCents === "number" &&
      item.effectivePriceCents < item.priceCents
      ? formatMoney(item.priceCents)
      : null

  const savingsLabel = getStoreSavingsLabel(item)
  const priceLabel = isAuction ? "Current bid" : "Price"
  const endsAt = isAuction ? formatEndsAt(item.endsAt) : null

  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
      data-testid="shop-listing-card"
    >
      <Link href={item.href} className="block" data-testid="shop-listing-card-image-link">
        <div className="aspect-square bg-stone-100">
          {item.primaryImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.primaryImageUrl} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-stone-500">
              No image
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
              {item.listingType}
            </div>
            <h3
              className="line-clamp-2 text-base font-semibold text-stone-900"
              data-testid="shop-listing-card-title"
            >
              <Link href={item.href}>{item.title}</Link>
            </h3>
          </div>

          {item.isFluorescent ? (
            <span
              className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900"
              data-testid="shop-listing-card-fluorescent"
            >
              Fluorescent
            </span>
          ) : null}
        </div>

        <div className="space-y-1 text-sm text-stone-700">
          <p data-testid="shop-listing-card-mineral">
            {item.primaryMineral ?? "Mineral not specified"}
          </p>
          <p data-testid="shop-listing-card-locality">
            {item.localityDisplay ?? "Locality not specified"}
          </p>
          <p data-testid="shop-listing-card-size">
            {item.sizeClass ?? "Size not specified"}
          </p>
        </div>

        <div className="border-t border-stone-100 pt-3 text-sm">
          {isAuction ? (
            <div className="min-h-[56px] space-y-1">
              <p className="font-medium text-stone-900" data-testid="shop-listing-card-price">
                {priceLabel}: {displayPrice ?? "—"}
              </p>
              {endsAt ? (
                <p className="text-stone-600" data-testid="shop-listing-card-ends-at">
                  Ends: {endsAt}
                </p>
              ) : (
                <div className="h-[20px]" />
              )}
            </div>
          ) : (
            <div className="min-h-[72px] space-y-1">
              <p className="font-medium text-stone-900" data-testid="shop-listing-card-price">
                {priceLabel}: {displayPrice ?? "—"}
              </p>

              <p
                className={`text-stone-500 ${originalPrice ? "line-through" : "invisible"}`}
                data-testid="shop-listing-card-original-price"
              >
                {originalPrice ?? "$0.00"}
              </p>

              <p
                className={`text-xs font-medium text-emerald-700 ${savingsLabel ? "" : "invisible"}`}
                data-testid="shop-listing-card-savings"
              >
                {savingsLabel ?? "placeholder"}
              </p>
            </div>
          )}
        </div>

        <div className="mt-auto pt-1">
          <Link
            href={item.href}
            className="inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
            data-testid="shop-listing-card-link"
          >
            View listing
          </Link>
        </div>
      </div>
    </article>
  )
}