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

const isAuctionItem = (item: HomeSectionDto["items"][number]) =>
  typeof item.auctionId === "string" && item.auctionId.length > 0

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

function getDisplaySectionTitle(title: string) {
  const normalized = title.toLowerCase()

  if (normalized.includes("featured") && normalized.includes("listing")) {
    return "Available Now"
  }

  return title
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

function getEmptyStateCopy(title: string, kind: "listing" | "auction") {
  const normalized = title.toLowerCase()

  if (normalized.includes("ending")) {
    return {
      title: "No auctions ending soon",
      description: "New live auctions will appear here when bidding windows are active.",
      actionLabel: "Browse auctions",
      href: "/auctions",
      icon: <Clock3 className="h-5 w-5" />,
    }
  }

  if (normalized.includes("upcoming")) {
    return {
      title: "Upcoming auctions coming soon",
      description: "Scheduled auctions will appear here before bidding opens.",
      actionLabel: "Browse auctions",
      href: "/auctions",
      icon: <CalendarDays className="h-5 w-5" />,
    }
  }

  if (kind === "auction") {
    return {
      title: "No auctions right now",
      description: "Check back soon for new bidding opportunities.",
      actionLabel: "Browse auctions",
      href: "/auctions",
      icon: <Gavel className="h-5 w-5" />,
    }
  }

  return {
    title: "More specimens coming soon",
    description: "New fixed-price minerals will appear here once they’re available.",
    actionLabel: "Browse shop",
    href: "/shop",
    icon: <Gem className="h-5 w-5" />,
  }
}

function sectionToneClass(sectionTitle: string, kind: "listing" | "auction") {
  const normalized = sectionTitle.toLowerCase()

  if (normalized.includes("ending")) return "mk-home-section-ending"
  if (normalized.includes("upcoming")) return "mk-home-section-upcoming"
  if (normalized.includes("new")) return "mk-home-section-new"
  if (kind === "auction") return "mk-home-section-auction"

  return "mk-home-section-featured"
}

function getImageBadgeLabel(args: {
  kind: "listing" | "auction"
  scheduledAuction: boolean
  status?: string | null
}) {
  if (args.kind === "listing") return "Listing"
  if (args.scheduledAuction) return "Upcoming"

  return args.status?.replaceAll("_", " ") ?? "Auction"
}

export function HomeSection({ section, kind }: HomeSectionProps) {
  const displayTitle = getDisplaySectionTitle(section.title)
  const sectionSlug = displayTitle.toLowerCase().replace(/\s+/g, "-")
  const toneClass = sectionToneClass(displayTitle, kind)
  const normalizedTitle = displayTitle.toLowerCase()

  const sectionItems =
    kind === "auction" || normalizedTitle.includes("auction")
      ? section.items.filter((item) => isAuctionItem(item))
      : section.items.filter((item) => !isAuctionItem(item))

  const visibleItems = sectionItems.slice(0, 4)

  return (
    <section
      className={`mk-home-section mk-glass-strong flex min-h-[720px] w-full max-w-full flex-col overflow-hidden rounded-[2rem] p-4 sm:p-5 ${toneClass}`}
      data-testid={`home-section-${sectionSlug}`}
    >
      <div className="relative z-10 mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="mk-home-section-icon grid h-9 w-9 shrink-0 place-items-center rounded-2xl">
              {getSectionIcon(displayTitle, kind)}
            </span>

            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-2xl">
                {displayTitle}
              </h2>

              <p className="text-sm mk-muted-text">
                {section.count} item{section.count === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="mk-home-section-browse shrink-0 rounded-2xl border-[color:var(--mk-border)] bg-[color:var(--mk-panel)]/75 text-[color:var(--mk-ink)] backdrop-blur hover:bg-[color:var(--mk-panel-muted)]"
        >
          <Link
            href={section.browseHref}
            data-testid={`home-section-browse-${sectionSlug}`}
          >
            Browse all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {visibleItems.length === 0 ? (
        <HomeSectionEmptyState title={displayTitle} kind={kind} />
      ) : (
        <div className="mk-scroll-rail mk-home-items-rail pb-2 xl:grid xl:grid-cols-2 xl:overflow-visible">
          {visibleItems.map((item, index) => {
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
  const badgeLabel = getImageBadgeLabel({ kind, scheduledAuction, status: item.status })

  return (
    <article className="mk-home-item-card mk-glass mk-scroll-card flex flex-col overflow-hidden rounded-3xl p-3 transition duration-300 hover:-translate-y-0.5">
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

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10 opacity-80" />

          <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm backdrop-blur">
            {badgeLabel}
          </div>

          <button
            type="button"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/85 text-stone-900 shadow-sm backdrop-blur transition hover:scale-105 hover:bg-white"
            aria-label="Save item"
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>
      </Link>

      <div className="flex flex-1 flex-col pt-4">
        <div className="space-y-1">
          <Link
            href={item.href}
            className="line-clamp-2 font-semibold tracking-tight text-[color:var(--mk-ink)] hover:underline"
          >
            {item.title}
          </Link>

          <div className="text-xs font-semibold uppercase tracking-wide mk-muted-text">
            {kind === "auction"
              ? scheduledAuction
                ? "Opening bid"
                : "Current bid"
              : "Available now"}
          </div>
        </div>

        <div className="mt-3 min-h-[76px] space-y-1 text-sm">
          {displayPrice ? (
            <div className="text-xl font-semibold tracking-tight text-[color:var(--mk-gold)]">
              {displayPrice}
            </div>
          ) : null}

          {kind === "auction" ? (
            <>
              {endsAt ? (
                <div className="flex items-center gap-1.5 mk-muted-text">
                  <Clock3 className="h-3.5 w-3.5 text-[color:var(--mk-home-section-accent,var(--mk-gold))]" />
                  Ends <LocalTime value={endsAt} />
                </div>
              ) : null}

              {startsAt ? (
                <div className="flex items-center gap-1.5 mk-muted-text">
                  <CalendarDays className="h-3.5 w-3.5 text-[color:var(--mk-home-section-accent,var(--mk-gold))]" />
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
                <div className="inline-flex rounded-full bg-[color:var(--mk-success)]/10 px-2 py-0.5 text-xs font-semibold text-[color:var(--mk-success)]">
                  {savingsLabel}
                </div>
              ) : (
                <div className="text-xs opacity-0">placeholder</div>
              )}
            </>
          )}
        </div>

        <Button asChild className="mk-cta mt-auto w-full rounded-2xl">
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

function HomeSectionEmptyState({
  title,
  kind,
}: {
  title: string
  kind: "listing" | "auction"
}) {
  const copy = getEmptyStateCopy(title, kind)

  return (
    <div className="mk-home-empty flex flex-1 flex-col justify-between overflow-hidden rounded-3xl border border-dashed border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-5">
      <div className="relative z-10 space-y-4">
        <div className="inline-grid h-11 w-11 place-items-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] text-[color:var(--mk-home-section-accent,var(--mk-gold))] shadow-sm">
          {copy.icon}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-[color:var(--mk-ink)]">
            {copy.title}
          </h3>

          <p className="max-w-sm text-sm leading-6 mk-muted-text">
            {copy.description}
          </p>
        </div>
      </div>

      <Button
        asChild
        variant="outline"
        className="relative z-10 mt-6 w-full rounded-2xl border-[color:var(--mk-border)] bg-[color:var(--mk-panel)]/80 text-[color:var(--mk-ink)] hover:bg-[color:var(--mk-panel-muted)]"
      >
        <Link href={copy.href}>
          {copy.actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}