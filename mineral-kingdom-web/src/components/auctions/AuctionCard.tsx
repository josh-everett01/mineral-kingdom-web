import Link from "next/link"
import {
  formatMoney,
  type AuctionBrowseItemDto,
} from "@/lib/auctions/getAuctions"
import { LocalTime } from "@/components/ui/LocalTime"

type Props = {
  item: AuctionBrowseItemDto
  highlightEndingSoon?: boolean
}

export function AuctionCard({ item, highlightEndingSoon = false }: Props) {
  const isScheduled = (item.status ?? "").toUpperCase() === "SCHEDULED"

  return (
    <article
      className={[
        "overflow-hidden rounded-2xl border bg-white shadow-sm",
        highlightEndingSoon ? "border-amber-300 ring-1 ring-amber-200" : "border-stone-200",
      ].join(" ")}
      data-testid="auction-card"
    >
      <Link href={item.href} className="block" data-testid="auction-card-image-link">
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
              {isScheduled ? "Upcoming auction" : item.status}
            </div>
            <h3
              className="line-clamp-2 text-base font-semibold text-stone-900"
              data-testid="auction-card-title"
            >
              <Link href={item.href}>{item.title}</Link>
            </h3>
          </div>

          {item.isFluorescent ? (
            <span
              className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900"
              data-testid="auction-card-fluorescent"
            >
              Fluorescent
            </span>
          ) : null}
        </div>

        <div className="space-y-1 text-sm text-stone-700">
          <p data-testid="auction-card-locality">
            {item.localityDisplay ?? "Locality not specified"}
          </p>
          <p data-testid="auction-card-size">
            {item.sizeClass ?? "Size not specified"}
          </p>
        </div>

        <div className="space-y-1 border-t border-stone-100 pt-3 text-sm">
          {isScheduled ? (
            <>
              <p className="font-medium text-stone-900" data-testid="auction-card-price">
                Opening bid: {formatMoney(item.startingPriceCents) ?? "—"}
              </p>
              <p className="text-stone-600" data-testid="auction-card-bid-count">
                Starts: <LocalTime value={item.startTimeUtc} />
              </p>
              <p className="text-stone-600" data-testid="auction-card-closing-time">
                Ends: <LocalTime value={item.closingTimeUtc} />
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-stone-900" data-testid="auction-card-price">
                Current bid: {formatMoney(item.currentPriceCents) ?? "—"}
              </p>
              <p className="text-stone-600" data-testid="auction-card-bid-count">
                {item.bidCount} bid{item.bidCount === 1 ? "" : "s"}
              </p>
              <p className="text-stone-600" data-testid="auction-card-closing-time">
                Ends: <LocalTime value={item.closingTimeUtc} />
              </p>
            </>
          )}
        </div>

        <Link
          href={item.href}
          className="inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700"
          data-testid="auction-card-link"
        >
          {isScheduled ? "View upcoming auction" : "View auction"}
        </Link>
      </div>
    </article>
  )
}