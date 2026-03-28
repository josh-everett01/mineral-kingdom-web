type Props = {
  title?: string
  subtitle?: string
}

export function DashboardHeader({
  title = "Dashboard",
  subtitle = "See the most important actions and status updates across your auctions, orders, shipping invoices, and fulfillment activity.",
}: Props) {
  return (
    <section className="space-y-2" data-testid="dashboard-header">
      <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
        Member dashboard
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-stone-900">{title}</h1>
      <p className="max-w-3xl text-sm text-stone-600 sm:text-base">{subtitle}</p>
    </section>
  )
}