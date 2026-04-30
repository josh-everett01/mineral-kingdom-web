export function DashboardEmptyState() {
  return (
    <section
      className="mk-glass-strong rounded-[2rem] border-dashed p-8 text-center"
      data-testid="dashboard-empty"
    >
      <h2 className="text-xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
        Nothing needs your attention right now
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 mk-muted-text sm:text-base">
        When you place bids, win auctions, pay shipping invoices, or receive fulfillment updates,
        they will appear here.
      </p>
    </section>
  )
}