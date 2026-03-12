import { ListingBrowseCard } from "@/components/shop/ListingBrowseCard"
import { ShopFilters } from "@/components/shop/ShopFilters"
import { ShopPagination } from "@/components/shop/ShopPagination"
import type { ListingBrowseResponseDto } from "@/lib/shop/getListings"

type Props = {
  data: ListingBrowseResponseDto | null
  searchParams: Record<string, string | string[] | undefined>
  eyebrow?: string
  title: string
  description: string
  testId?: string
}

export function ShopBrowseView({
  data,
  searchParams,
  eyebrow = "Mineral Kingdom Shop",
  title,
  description,
  testId = "shop-page",
}: Props) {
  if (!data) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"
          data-testid="shop-error-state"
        >
          We couldn&apos;t load shop listings right now.
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8" data-testid={testId}>
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">{title}</h1>
        <p className="max-w-2xl text-sm text-stone-600 sm:text-base">{description}</p>
      </section>

      <ShopFilters availableFilters={data.availableFilters} />

      <section className="flex items-center justify-between gap-3" data-testid="shop-results-summary">
        <p className="text-sm text-stone-600">
          Showing {data.items.length} of {data.total} listing{data.total === 1 ? "" : "s"}
        </p>
      </section>

      {data.items.length === 0 ? (
        <section
          className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm"
          data-testid="shop-empty-state"
        >
          <h2 className="text-lg font-semibold text-stone-900">No listings match those filters</h2>
          <p className="mt-2 text-sm text-stone-600">
            Try clearing one or more filters to broaden your results.
          </p>
        </section>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4" data-testid="shop-results-grid">
          {data.items.map((item) => (
            <ListingBrowseCard key={item.id} item={item} />
          ))}
        </section>
      )}

      <ShopPagination
        page={data.page}
        totalPages={data.totalPages}
        searchParams={searchParams}
      />
    </main>
  )
}