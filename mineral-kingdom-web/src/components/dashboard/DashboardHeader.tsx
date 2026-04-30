type Props = {
  title?: string
  subtitle?: string
}

export function DashboardHeader({
  title = "Dashboard",
  subtitle = "See the most important actions and status updates across your auctions, orders, shipping invoices, and fulfillment activity.",
}: Props) {
  return (
    <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7" data-testid="dashboard-header">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
        Member dashboard
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 mk-muted-text sm:text-base">
        {subtitle}
      </p>
    </section>
  )
}