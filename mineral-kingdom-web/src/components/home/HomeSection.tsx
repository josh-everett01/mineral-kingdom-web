import type { CSSProperties } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Clock3,
  Gem,
  Gavel,
  Heart,
  ShoppingBag,
  Sparkles,
} from "lucide-react"

import {
  HomeSectionDto,
  formatMoney,
} from "@/lib/home/getHomeSections"
import { Button } from "@/components/ui/button"
import { LocalTime } from "@/components/ui/LocalTime"

type HomeSectionProps = {
  section: HomeSectionDto
  kind: "listing" | "auction"
}

const specimenGradients = [
  ["#d946ef", "#7c3aed"],
  ["#22c55e", "#0891b2"],
  ["#f97316", "#dc2626"],
  ["#38bdf8", "#1d4ed8"],
  ["#facc15", "#c87819"],
  ["#fb7185", "#9d174d"],
]

function getSavingsLabel(item: HomeSectionDto["items"][number], kind: "listing" | "auction") {
  if (kind === "auction") return null

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

function isScheduledAuction(item: HomeSectionDto["items"][number], kind: "listing" | "auction") {
  return kind === "auction" && (item.status ?? "").toUpperCase() === "SCHEDULED"
}

function getSectionIcon(title: string, kind: "listing" | "auction") {
  const normalized = title.toLowerCase()

  if (normalized.includes("ending")) return <Clock3 className="h-5 w-5" />
  if (normalized.includes("upcoming")) return <CalendarDays className="h-5 w-5" />
  if (normalized.includes("new")) return <Sparkles className="h-5 w-5" />
  if (kind === "auction") return <Gavel className="h-5 w-5" />

  return <Gem className="h-5 w-5" />
}

function getEmptyMessage(kind: "listing" | "auction") {
  return kind === "auction"
    ? "No auctions to show yet. Check back soon for new bidding opportunities."
    : "No listings to show yet. New specimens will appear here once published."
}

export function HomeSection({ section, kind }: HomeSectionProps) {
  return (
    <section
      className="mk-glass-strong w-full max-w-full overflow-hidden rounded-[2rem] p-4 sm:p-5"
      data-testid={`home-section-${section.title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[color:var(--mk-gold)]">
            {getSectionIcon(section.title, kind)}
            <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {section.title}
            </h2>
          </div>

          <p className="text-sm mk-muted-text">
            {section.count} item{section.count === 1 ? "" : "s"}
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="shrink-0 rounded-2xl border-[color:var(--mk-border)] bg-[color:var(--mk-panel)]"
        >
          <Link
            href={section.browseHref}
            data-testid={`home-section-browse-${section.title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            Browse all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {section.items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-6 text-sm mk-muted-text">
          {getEmptyMessage(kind)}
        </div>
      ) : (
        <div className="mk-scroll-rail pb-2 xl:grid xl:grid-cols-2 xl:overflow-visible">
          {section.items.map((item, index) => {
            const scheduledAuction = isScheduledAuction(item, kind)

            const displayPrice =
              kind === "auction"
                ? scheduledAuction
                  ? formatMoney(item.startingPriceCents ?? item.currentBidCents)
                  : formatMoney(item.currentBidCents)
                : formatMoney(item.effectivePriceCents ?? item.priceCents)

            const originalPrice =
              kind === "listing" &&
                typeof item.priceCents === "number" &&
                typeof item.effectivePriceCents === "number" &&
                item.effectivePriceCents < item.priceCents
                ? formatMoney(item.priceCents)
                : null

            const savingsLabel = getSavingsLabel(item, kind)
            const endsAt =
              kind === "auction" && !scheduledAuction ? item.endsAt ?? null : null

            const startsAt =
              kind === "auction" && scheduledAuction ? item.startTime ?? null : null

            return (
              <HomeItemCard
                key={`${item.listingId}-${item.auctionId ?? "listing"}`}
                item={item}
                index={index}
                kind={kind}
                scheduledAuction={scheduledAuction}
                displayPrice={displayPrice}
                originalPrice={originalPrice}
                savingsLabel={savingsLabel}
                endsAt={endsAt}
                startsAt={startsAt}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}

function HomeItemCard({
  item,
  index,
  kind,
  scheduledAuction,
  displayPrice,
  originalPrice,
  savingsLabel,
  endsAt,
  startsAt,
}: {
  item: HomeSectionDto["items"][number]
  index: number
  kind: "listing" | "auction"
  scheduledAuction: boolean
  displayPrice: string | null
  originalPrice: string | null
  savingsLabel: string | null
  endsAt: string | null
  startsAt: string | null
}) {
  const [specimenA, specimenB] = specimenGradients[index % specimenGradients.length]

  return (
    <article className="mk-glass mk-scroll-card flex flex-col overflow-hidden rounded-3xl p-3">
      <Link href={item.href} className="group block">
        <div className="relative overflow-hidden rounded-2xl">
          {item.primaryImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.primaryImageUrl}
              alt={item.title}
              className="aspect-4/3 w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="mk-specimen-bg aspect-4/3 w-full"
              style={
                {
                  "--specimen-a": specimenA,
                  "--specimen-b": specimenB,
                } as CSSProperties
              }
            />
          )}

          <div className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
            {kind === "auction"
              ? scheduledAuction
                ? "Upcoming"
                : item.status ?? "Auction"
              : "Listing"}
          </div>

          <button
            type="button"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/80 text-stone-900 shadow-sm backdrop-blur transition hover:scale-105"
            aria-label="Save item"
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>
      </Link>

      <div className="flex flex-1 flex-col pt-4">
        <div className="space-y-1">
          <Link href={item.href} className="line-clamp-2 font-semibold tracking-tight hover:underline">
            {item.title}
          </Link>

          <div className="text-xs uppercase tracking-wide mk-muted-text">
            {kind === "auction"
              ? scheduledAuction
                ? "Opening bid"
                : "Current bid"
              : "Available now"}
          </div>
        </div>

        <div className="mt-3 min-h-[76px] space-y-1 text-sm">
          {displayPrice ? (
            <div className="text-lg font-semibold text-[color:var(--mk-gold)]">
              {displayPrice}
            </div>
          ) : null}

          {kind === "auction" ? (
            <>
              {endsAt ? (
                <div className="flex items-center gap-1.5 mk-muted-text">
                  <Clock3 className="h-3.5 w-3.5" />
                  Ends <LocalTime value={endsAt} />
                </div>
              ) : null}

              {startsAt ? (
                <div className="flex items-center gap-1.5 mk-muted-text">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Starts <LocalTime value={startsAt} />
                </div>
              ) : null}
            </>
          ) : (
            <>
              {originalPrice ? (
                <div className="text-sm line-through mk-muted-text">{originalPrice}</div>
              ) : (
                <div className="text-sm opacity-0">placeholder</div>
              )}

              {savingsLabel ? (
                <div className="text-xs font-semibold text-[color:var(--mk-success)]">
                  {savingsLabel}
                </div>
              ) : (
                <div className="text-xs opacity-0">placeholder</div>
              )}
            </>
          )}
        </div>

        <Button
          asChild
          className="mk-cta mt-auto w-full rounded-2xl"
        >
          <Link href={item.href}>
            {kind === "auction" ? (
              scheduledAuction ? (
                <>
                  <Bell className="h-4 w-4" />
                  View upcoming
                </>
              ) : (
                <>
                  <Gavel className="h-4 w-4" />
                  View auction
                </>
              )
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                View listing
              </>
            )}
          </Link>
        </Button>
      </div>
    </article>
  )
}