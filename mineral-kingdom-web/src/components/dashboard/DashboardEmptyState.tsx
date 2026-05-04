import { LayoutDashboard } from "lucide-react"

export function DashboardEmptyState() {
  return (
    <section
      className="mk-glass-strong rounded-[2rem] border-dashed p-8 text-center"
      data-testid="dashboard-empty"
    >
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-gold)] shadow-sm">
        <LayoutDashboard className="h-5 w-5" />
      </div>

      <h2 className="mt-4 text-xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
        Nothing needs your attention right now
      </h2>

      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 mk-muted-text sm:text-base">
        When you place bids, win auctions, pay shipping invoices, or receive fulfillment updates,
        they will appear here.
      </p>
    </section>
  )
}