import Link from "next/link"
import { ArrowRight, Bell, Clock3, Gavel, Gem, Sparkles } from "lucide-react"

import {
  formatMoney,
  type AuctionBrowseItemDto,
} from "@/lib/auctions/getAuctions"
import { LocalTime } from "@/components/ui/LocalTime"

type Props = {
  item: AuctionBrowseItemDto
  highlightEndingSoon?: boolean
}

function normalizeStatus(status?: string | null) {
  return (status ?? "").trim().toUpperCase()
}

function getStatusLabel(status?: string | null, highlightEndingSoon?: boolean) {
  if (highlightEndingSoon) return "Closing soon"

  switch (normalizeStatus(status)) {
    case "SCHEDULED":
      return "Upcoming"
    case "LIVE":
      return "Live auction"
    case "CLOSING":
      return "Closing"
    case "ENDED":
      return "Ended"
    default:
      return status?.replaceAll("_", " ") ?? "Auction"
  }
}

export function AuctionCard({ item, highlightEndingSoon = false }: Props) {
  const status = normalizeStatus(item.status)
  const isScheduled = status === "SCHEDULED"
  const statusLabel = getStatusLabel(item.status, highlightEndingSoon)

  return (
    <article
      className={[
        "mk-glass flex h-full flex-col overflow-hidden rounded-[2rem] transition duration-300 hover:-translate-y-0.5",
        highlightEndingSoon ? "ring-1 ring-[color:var(--mk-gold)]" : "",
      ].join(" ")}
      data-testid="auction-card"
    >
      <Link href={item.href} className="block p-3 pb-0" data-testid="auction-card-image-link">
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

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10 opacity-80" />

          <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm backdrop-blur">
            {statusLabel}
          </div>

          {highlightEndingSoon ? (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-[color:var(--mk-danger)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
              <Clock3 className="h-3 w-3" />
              Ending soon
            </span>
          ) : null}

          {item.isFluorescent ? (
            <span
              className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[color:var(--mk-gold)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm"
              data-testid="auction-card-fluorescent"
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
            {isScheduled ? "Opening bid" : "Current bid"}
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

        <div className="space-y-1 border-t border-[color:var(--mk-border)] pt-3 text-sm">
          {isScheduled ? (
            <>
              <p
                className="font-semibold text-[color:var(--mk-gold)]"
                data-testid="auction-card-price"
              >
                Opening bid: {formatMoney(item.startingPriceCents) ?? "—"}
              </p>
              <p className="mk-muted-text" data-testid="auction-card-bid-count">
                Starts: <LocalTime value={item.startTimeUtc} />
              </p>
              <p className="mk-muted-text" data-testid="auction-card-closing-time">
                Ends: <LocalTime value={item.closingTimeUtc} />
              </p>
            </>
          ) : (
            <>
              <p
                className="font-semibold text-[color:var(--mk-gold)]"
                data-testid="auction-card-price"
              >
                Current bid: {formatMoney(item.currentPriceCents) ?? "—"}
              </p>
              <p className="mk-muted-text" data-testid="auction-card-bid-count">
                {item.bidCount} bid{item.bidCount === 1 ? "" : "s"}
              </p>
              <p className="mk-muted-text" data-testid="auction-card-closing-time">
                Ends: <LocalTime value={item.closingTimeUtc} />
              </p>
            </>
          )}
        </div>

        <Link
          href={item.href}
          className="mk-cta mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99]"
          data-testid="auction-card-link"
        >
          {isScheduled ? (
            <>
              <Bell className="h-4 w-4" />
              View upcoming
            </>
          ) : (
            <>
              <Gavel className="h-4 w-4" />
              View auction
            </>
          )}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  )
}