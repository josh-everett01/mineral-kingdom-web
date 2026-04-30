import Link from "next/link"
import { ArrowRight, Gem, Sparkles } from "lucide-react"

import { formatMoney, type ListingBrowseItemDto } from "@/lib/shop/getListings"
import { LocalTime } from "@/components/ui/LocalTime"

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
  const endsAt = isAuction ? item.endsAt : null

  return (
    <article
      className="mk-glass flex h-full flex-col overflow-hidden rounded-[2rem]"
      data-testid="shop-listing-card"
    >
      <Link href={item.href} className="block p-3 pb-0" data-testid="shop-listing-card-image-link">
        <div className="relative overflow-hidden rounded-3xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)]">
          <div className="aspect-square">
            {item.primaryImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.primaryImageUrl}
                alt={item.title}
                className="h-full w-full object-cover transition duration-500 hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm mk-muted-text">
                <Gem className="mr-2 h-5 w-5 text-[color:var(--mk-gold)]" />
                No image
              </div>
            )}
          </div>

          <div className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
            {item.listingType}
          </div>

          {item.isFluorescent ? (
            <span
              className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[color:var(--mk-gold)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm"
              data-testid="shop-listing-card-fluorescent"
            >
              <Sparkles className="h-3 w-3" />
              UV
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col space-y-3 p-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--mk-gold)]">
            {item.primaryMineral ?? "Mineral specimen"}
          </div>
          <h3
            className="mt-1 line-clamp-2 text-base font-semibold text-[color:var(--mk-ink)]"
            data-testid="shop-listing-card-title"
          >
            <Link href={item.href} className="hover:underline">
              {item.title}
            </Link>
          </h3>
        </div>

        <div className="space-y-1 text-sm mk-muted-text">
          <p data-testid="shop-listing-card-locality">
            {item.localityDisplay ?? "Locality not specified"}
          </p>
          <p data-testid="shop-listing-card-size">
            {item.sizeClass ?? "Size not specified"}
          </p>
        </div>

        <div className="border-t border-[color:var(--mk-border)] pt-3 text-sm">
          {isAuction ? (
            <div className="min-h-[56px] space-y-1">
              <p
                className="font-semibold text-[color:var(--mk-gold)]"
                data-testid="shop-listing-card-price"
              >
                {priceLabel}: {displayPrice ?? "—"}
              </p>
              {endsAt ? (
                <p className="mk-muted-text" data-testid="shop-listing-card-ends-at">
                  Ends: <LocalTime value={endsAt} />
                </p>
              ) : (
                <div className="h-[20px]" />
              )}
            </div>
          ) : (
            <div className="min-h-[72px] space-y-1">
              <p
                className="font-semibold text-[color:var(--mk-gold)]"
                data-testid="shop-listing-card-price"
              >
                {priceLabel}: {displayPrice ?? "—"}
              </p>

              <p
                className={`mk-muted-text ${originalPrice ? "line-through" : "invisible"}`}
                data-testid="shop-listing-card-original-price"
              >
                {originalPrice ?? "$0.00"}
              </p>

              <p
                className={`text-xs font-semibold text-[color:var(--mk-success)] ${savingsLabel ? "" : "invisible"}`}
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
            className="mk-cta inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99]"
            data-testid="shop-listing-card-link"
          >
            View listing
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}