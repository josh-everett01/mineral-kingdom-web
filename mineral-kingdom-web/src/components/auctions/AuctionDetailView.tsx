import {
  type AuctionDetailDto,
  formatEndsAt,
  formatMoney,
} from "@/lib/auctions/getAuctionDetail"

type Props = {
  data: AuctionDetailDto
}

export function AuctionDetailView({ data }: Props) {
  const primaryMedia = data.media.find((m) => m.isPrimary) ?? data.media[0] ?? null

  return (
    <main
      className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"
      data-testid="auction-detail-page"
    >
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Mineral Kingdom Auctions
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1
            className="text-3xl font-bold tracking-tight text-stone-900"
            data-testid="auction-detail-title"
          >
            {data.title}
          </h1>
          <span
            className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-800"
            data-testid="auction-detail-status"
          >
            {data.status}
          </span>
        </div>
        <p className="max-w-2xl text-sm text-stone-600 sm:text-base">
          Public auction details are now available. Member bidding and live auction updates will
          continue to expand in the next stories.
        </p>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
            data-testid="auction-detail-media"
          >
            <div className="aspect-square bg-stone-100">
              {primaryMedia ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={primaryMedia.url}
                  alt={data.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-stone-500">
                  No media available
                </div>
              )}
            </div>
          </div>

          <section
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            data-testid="auction-detail-description"
          >
            <h2 className="text-lg font-semibold text-stone-900">Description</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-700">
              {data.description?.trim() || "No description available."}
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <section
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            data-testid="auction-detail-summary"
          >
            <h2 className="text-lg font-semibold text-stone-900">Auction summary</h2>

            <dl className="mt-4 space-y-4 text-sm text-stone-700">
              <div>
                <dt className="font-medium text-stone-500">Current bid</dt>
                <dd className="mt-1 text-base font-semibold text-stone-900" data-testid="auction-detail-price">
                  {formatMoney(data.currentPriceCents) ?? "—"}
                </dd>
              </div>

              <div>
                <dt className="font-medium text-stone-500">Bid count</dt>
                <dd className="mt-1" data-testid="auction-detail-bid-count">
                  {data.bidCount} bid{data.bidCount === 1 ? "" : "s"}
                </dd>
              </div>

              <div>
                <dt className="font-medium text-stone-500">Ends</dt>
                <dd className="mt-1" data-testid="auction-detail-closing-time">
                  {formatEndsAt(data.closingTimeUtc) ?? "—"}
                </dd>
              </div>

              <div>
                <dt className="font-medium text-stone-500">Minimum next bid</dt>
                <dd className="mt-1" data-testid="auction-detail-minimum-next-bid">
                  {formatMoney(data.minimumNextBidCents) ?? "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section
            className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm"
            data-testid="auction-detail-bidding-placeholder"
          >
            <h2 className="text-lg font-semibold text-amber-950">Member bidding</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              Sign in to bid. Interactive bidding and realtime auction updates will be added in the
              next stories.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}