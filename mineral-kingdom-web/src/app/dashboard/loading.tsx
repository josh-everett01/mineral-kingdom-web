import { Container } from "@/components/site/Container"

export default function DashboardLoading() {
  return (
    <Container className="py-10">
      <section
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        data-testid="dashboard-loading"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Member dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
          Loading your dashboard
        </h1>
        <p className="mt-2 text-sm text-stone-600 sm:text-base">
          We’re gathering your latest orders, auctions, shipping invoices, and fulfillment updates.
        </p>
      </section>
    </Container>
  )
}