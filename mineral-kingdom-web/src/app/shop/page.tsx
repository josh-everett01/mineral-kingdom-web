import { ListingBrowseCard } from "@/components/shop/ListingBrowseCard"
import { ShopFilters } from "@/components/shop/ShopFilters"
import { ShopPagination } from "@/components/shop/ShopPagination"
import { fetchListings } from "@/lib/shop/getListings"

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ShopPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const data = await fetchListings(resolvedSearchParams)

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
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8" data-testid="shop-page">
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Mineral Kingdom Shop
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Browse listings
        </h1>
        <p className="max-w-2xl text-sm text-stone-600 sm:text-base">
          Explore fixed-price specimens and live auction inventory. Filter by mineral type,
          size class, price, or fluorescent material.
        </p>
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
        searchParams={resolvedSearchParams}
      />
    </main>
  )
}