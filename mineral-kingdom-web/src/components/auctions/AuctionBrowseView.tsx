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
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"
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
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8" data-testid={testId}>
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">{title}</h1>
        <p className="max-w-2xl text-sm text-stone-600 sm:text-base">{description}</p>
      </section>

      <section
        className="flex items-center justify-between gap-3"
        data-testid="auctions-results-summary"
      >
        <p className="text-sm text-stone-600">
          Showing {data.items.length} of {data.total} auction{data.total === 1 ? "" : "s"}
        </p>
      </section>

      {endingSoonItems.length > 0 ? (
        <section className="space-y-4" data-testid="auctions-ending-soon-section">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-stone-900">Ending soon</h2>
            <p className="text-sm text-stone-600">
              Auctions closing within the next hour.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {endingSoonItems.map((item) => (
              <AuctionCard key={`ending-soon-${item.id}`} item={item} highlightEndingSoon />
            ))}
          </div>
        </section>
      ) : null}

      {liveItems.length === 0 && scheduledItems.length === 0 ? (
        <section
          className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm"
          data-testid="auctions-empty-state"
        >
          <h2 className="text-lg font-semibold text-stone-900">No auctions right now</h2>
          <p className="mt-2 text-sm text-stone-600">
            Check back soon for newly launched and upcoming auctions.
          </p>
        </section>
      ) : (
        <>
          {liveItems.length > 0 ? (
            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-stone-900">Live auctions</h2>
                <p className="text-sm text-stone-600">
                  Active and closing mineral auctions sorted by closing time.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4" data-testid="auctions-results-grid">
                {liveItems.map((item) => (
                  <AuctionCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ) : null}

          {scheduledItems.length > 0 ? (
            <section className="space-y-4" data-testid="auctions-upcoming-section">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-stone-900">Upcoming auctions</h2>
                <p className="text-sm text-stone-600">
                  Scheduled auctions that will open for bidding soon.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {scheduledItems.map((item) => (
                  <AuctionCard key={`scheduled-${item.id}`} item={item} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  )
}