import Link from "next/link"
import { ArrowRight, Clock3, Gavel, Gem } from "lucide-react"

import { formatMoney, type AuctionBrowseItemDto } from "@/lib/auctions/getAuctions"
import { LocalTime } from "@/components/ui/LocalTime"

type Props = {
  item: AuctionBrowseItemDto
  highlightEndingSoon?: boolean
}

function normalizeStatus(value?: string | null) {
  return (value ?? "").trim().toUpperCase()
}

function getAuctionBadgeLabel(item: AuctionBrowseItemDto, highlightEndingSoon?: boolean) {
  const status = normalizeStatus(item.status)

  if (highlightEndingSoon) return "Ending soon"
  if (status === "SCHEDULED") return "Upcoming auction"
  if (status === "LIVE") return "Live auction"

  return "Auction"
}

function getAuctionPriceLabel(item: AuctionBrowseItemDto) {
  const status = normalizeStatus(item.status)

  if (status === "SCHEDULED") return "Opening bid"

  return "Current bid"
}

export function AuctionCard({ item, highlightEndingSoon = false }: Props) {
  const isScheduled = normalizeStatus(item.status) === "SCHEDULED"

  const displayPrice = isScheduled
    ? formatMoney(item.startingPriceCents ?? item.currentPriceCents)
    : formatMoney(item.currentPriceCents)

  const priceLabel = getAuctionPriceLabel(item)

  return (
    <article
      className="mk-glass flex h-full flex-col overflow-hidden rounded-[2rem]"
      data-testid="auction-card"
    >
      <Link href={item.href} className="group block p-3 pb-0" data-testid="auction-card-image-link">
        <div className="relative overflow-hidden rounded-3xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)]">
          <div className="mk-specimen-bg flex aspect-4/3 items-center justify-center overflow-hidden rounded-3xl">
            {item.primaryImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.primaryImageUrl}
                alt={item.title}
                className="h-full w-full rounded-[1.35rem] object-contain p-1 transition duration-500 group-hover:scale-[1.035]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm mk-muted-text">
                <Gem className="mr-2 h-5 w-5 text-[color:var(--mk-gold)]" />
                No image
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-t from-black/25 via-transparent to-black/5 opacity-70" />

          <div className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
            {getAuctionBadgeLabel(item, highlightEndingSoon)}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col space-y-3 p-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--mk-gold)]">
            {priceLabel}
          </div>

          <h3
            className="mt-1 line-clamp-2 text-base font-semibold text-[color:var(--mk-ink)]"
            data-testid="auction-card-title"
          >
            <Link href={item.href} className="hover:underline">
              {item.title}
            </Link>
          </h3>
        </div>

        <div className="space-y-1 text-sm mk-muted-text">
          <p data-testid="auction-card-locality">
            {item.localityDisplay ?? "Locality not specified"}
          </p>

          <p data-testid="auction-card-size">
            {item.sizeClass ?? "Size not specified"}
          </p>
        </div>

        <div className="border-t border-[color:var(--mk-border)] pt-3 text-sm">
          <div className="min-h-[88px] space-y-1">
            <p
              className="font-semibold text-[color:var(--mk-gold)]"
              data-testid="auction-card-current-bid"
            >
              {priceLabel}: {displayPrice ?? "—"}
            </p>

            {!isScheduled ? (
              <div
                className="flex items-center gap-1.5 mk-muted-text"
                data-testid="auction-card-ends-at"
              >
                <Clock3 className="h-3.5 w-3.5 text-[color:var(--mk-gold)]" />
                <span>
                  Ends <LocalTime value={item.closingTimeUtc} />
                </span>
              </div>
            ) : null}

            {isScheduled && item.startTimeUtc ? (
              <div
                className="flex items-center gap-1.5 mk-muted-text"
                data-testid="auction-card-starts-at"
              >
                <Clock3 className="h-3.5 w-3.5 text-[color:var(--mk-gold)]" />
                <span>
                  Starts <LocalTime value={item.startTimeUtc} />
                </span>
              </div>
            ) : null}

            <p className="mk-muted-text" data-testid="auction-card-bid-count">
              {item.bidCount ?? 0} bid{(item.bidCount ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="mt-auto pt-1">
          <Link
            href={item.href}
            className="mk-cta inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99]"
            data-testid="auction-card-link"
          >
            <Gavel className="h-4 w-4" />
            {isScheduled ? "View upcoming auction" : "View auction"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}