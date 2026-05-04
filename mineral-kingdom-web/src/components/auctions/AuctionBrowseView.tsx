import Link from "next/link"
import { CalendarDays, Clock3, Gavel } from "lucide-react"

import { AuctionCard } from "@/components/auctions/AuctionCard"
import {
  type AuctionBrowseResponseDto,
  isEndingSoon,
} from "@/lib/auctions/getAuctions"

type Props = {
  data: AuctionBrowseResponseDto | null
  eyebrow?: string
  title: string
  description: string
  testId?: string
}

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "").trim().toUpperCase()
}

export function AuctionBrowseView({
  data,
  eyebrow = "Mineral Kingdom Auctions",
  title,
  description,
  testId = "auctions-page",
}: Props) {
  if (!data) {
    return (
      <main className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
        <div
          className="mx-auto max-w-[1440px] rounded-[2rem] border border-[color:var(--mk-danger)] bg-[color:var(--mk-panel-muted)] p-6 text-[color:var(--mk-danger)] shadow-sm"
          data-testid="auctions-error-state"
        >
          We couldn&apos;t load auctions right now.
        </div>
      </main>
    )
  }

  const liveItems = data.items.filter((item) => {
    const status = normalizeStatus(item.status)
    return status === "LIVE" || status === "CLOSING"
  })

  const scheduledItems = data.items.filter((item) => normalizeStatus(item.status) === "SCHEDULED")

  const endingSoonItems = liveItems.filter((item) =>
    isEndingSoon(item.closingTimeUtc, data.serverTimeUtc),
  )

  return (
    <main
      className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
      data-testid={testId}
    >
      <div className="mx-auto max-w-[1440px] space-y-8">
        <section className="mk-glass-strong overflow-hidden rounded-[2rem] p-5 sm:p-7">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              {eyebrow}
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
              {title}
            </h1>

            <p className="max-w-2xl text-sm leading-6 mk-muted-text sm:text-base">
              {description}
            </p>
          </div>
        </section>

        <section
          className="flex items-center justify-between gap-3"
          data-testid="auctions-results-summary"
        >
          <p className="text-sm mk-muted-text">
            Showing {data.items.length} auction{data.items.length === 1 ? "" : "s"}
          </p>
        </section>

        {endingSoonItems.length > 0 ? (
          <section className="space-y-4" data-testid="auctions-ending-soon-section">
            <SectionHeading
              icon={<Clock3 className="h-5 w-5" />}
              title="Ending Soon"
              description="Active auctions closing within the next hour."
            />

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {endingSoonItems.map((item) => (
                <AuctionCard key={`ending-soon-${item.id}`} item={item} highlightEndingSoon />
              ))}
            </div>
          </section>
        ) : null}

        {liveItems.length === 0 && scheduledItems.length === 0 ? (
          <section
            className="mk-glass-strong rounded-[2rem] p-8 text-center"
            data-testid="auctions-empty-state"
          >
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] text-[color:var(--mk-gold)] shadow-sm">
              <Gavel className="h-5 w-5" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-[color:var(--mk-ink)]">
              No auctions right now
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 mk-muted-text">
              New live and scheduled auctions will appear here once bidding opportunities are available.
            </p>

            <Link
              href="/shop"
              className="mt-5 inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] shadow-sm transition hover:bg-[color:var(--mk-panel-muted)]"
            >
              Browse Available Now
            </Link>
          </section>
        ) : (
          <>
            {liveItems.length > 0 ? (
              <section className="space-y-4">
                <SectionHeading
                  icon={<Gavel className="h-5 w-5" />}
                  title="Live Auctions"
                  description="Active mineral auctions sorted by closing time."
                />

                <div
                  className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4"
                  data-testid="auctions-results-grid"
                >
                  {liveItems.map((item) => (
                    <AuctionCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ) : null}

            {scheduledItems.length > 0 ? (
              <section className="space-y-4" data-testid="auctions-upcoming-section">
                <SectionHeading
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="Upcoming Auctions"
                  description="Scheduled auctions that will open for bidding soon."
                />

                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                  {scheduledItems.map((item) => (
                    <AuctionCard key={`scheduled-${item.id}`} item={item} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] text-[color:var(--mk-gold)] shadow-sm">
        {icon}
      </span>

      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
          {title}
        </h2>
        <p className="text-sm mk-muted-text">{description}</p>
      </div>
    </div>
  )
}