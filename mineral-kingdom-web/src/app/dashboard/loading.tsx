export default function DashboardLoading() {
  return (
    <div className="mk-preview-page min-h-screen overflow-x-hidden">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section
          className="mk-glass-strong rounded-[2rem] p-6"
          data-testid="dashboard-loading"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
            Member dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
            Loading your dashboard
          </h1>
          <p className="mt-2 text-sm leading-6 mk-muted-text sm:text-base">
            We’re gathering your latest orders, auctions, shipping invoices, and fulfillment updates.
          </p>
        </section>
      </main>
    </div>
  )
}