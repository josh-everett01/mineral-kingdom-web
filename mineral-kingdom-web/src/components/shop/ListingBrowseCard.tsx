import Link from "next/link"
import { formatEndsAt, formatMoney, type ListingBrowseItemDto } from "@/lib/shop/getListings"

type Props = {
  item: ListingBrowseItemDto
}

export function ListingBrowseCard({ item }: Props) {
  const displayPrice =
    item.listingType === "AUCTION"
      ? formatMoney(item.currentBidCents)
      : formatMoney(item.effectivePriceCents ?? item.priceCents)

  const priceLabel = item.listingType === "AUCTION" ? "Current bid" : "Price"
  const endsAt = item.listingType === "AUCTION" ? formatEndsAt(item.endsAt) : null

  return (
    <article
      className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
      data-testid="shop-listing-card"
    >
      <Link href={item.href} className="block" data-testid="shop-listing-card-image-link">
        <div className="aspect-square bg-stone-100">
          {item.primaryImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.primaryImageUrl}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-stone-500">
              No image
            </div>
          )}
        </div>
      </Link>

      <div className="space-y-3 p-4">
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

        <div className="space-y-1 border-t border-stone-100 pt-3 text-sm">
          <p className="font-medium text-stone-900" data-testid="shop-listing-card-price">
            {priceLabel}: {displayPrice ?? "—"}
          </p>
          {endsAt ? (
            <p className="text-stone-600" data-testid="shop-listing-card-ends-at">
              Ends: {endsAt}
            </p>
          ) : null}
        </div>

        <Link
          href={item.href}
          className="inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
          data-testid="shop-listing-card-link"
        >
          View listing
        </Link>
      </div>
    </article>
  )
}