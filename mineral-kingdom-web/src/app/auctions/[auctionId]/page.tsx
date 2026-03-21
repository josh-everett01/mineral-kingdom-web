type Props = {
  params: Promise<{ auctionId: string }>
}

export default async function AuctionDetailShellPage({ params }: Props) {
  const { auctionId } = await params

  return (
    <main
      className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8"
      data-testid="auction-detail-page"
    >
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Mineral Kingdom Auctions
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Auction detail coming next
        </h1>
        <p className="max-w-2xl text-sm text-stone-600 sm:text-base">
          Public auction browse is now live. Full auction detail, bidding, and realtime updates
          will be added in the next stories.
        </p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <dl className="space-y-2 text-sm text-stone-700">
          <div>
            <dt className="font-medium text-stone-900">Auction ID</dt>
            <dd data-testid="auction-detail-id">{auctionId}</dd>
          </div>
        </dl>
      </section>
    </main>
  )
}