export function DashboardEmptyState() {
  return (
    <section
      className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center shadow-sm"
      data-testid="dashboard-empty"
    >
      <h2 className="text-xl font-semibold tracking-tight text-stone-900">
        Nothing needs your attention right now
      </h2>
      <p className="mt-2 text-sm text-stone-600 sm:text-base">
        When you place bids, win auctions, pay shipping invoices, or receive fulfillment updates,
        they will appear here.
      </p>
    </section>
  )
}