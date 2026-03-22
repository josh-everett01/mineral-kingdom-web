export default function AuctionDetailNotFound() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div
        className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm"
        data-testid="auction-detail-not-found"
      >
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Auction not found
        </h1>
        <p className="mt-3 text-sm text-stone-600">
          We couldn&apos;t find that auction. It may have been removed or the link may be invalid.
        </p>
      </div>
    </main>
  )
}