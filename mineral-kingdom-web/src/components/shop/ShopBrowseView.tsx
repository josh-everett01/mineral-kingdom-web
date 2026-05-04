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
      <main className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
        <div
          className="mx-auto max-w-[1440px] rounded-[2rem] border border-[color:var(--mk-danger)] bg-[color:var(--mk-panel-muted)] p-6 text-[color:var(--mk-danger)] shadow-sm"
          data-testid="shop-error-state"
        >
          We couldn&apos;t load shop listings right now.
        </div>
      </main>
    )
  }

  return (
    <main
      className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
      data-testid={testId}
    >
      <div className="mx-auto max-w-[1440px] space-y-8">
        <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              {eyebrow}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 mk-muted-text sm:text-base">
              {description}
            </p>
          </div>
        </section>

        <ShopFilters availableFilters={data.availableFilters} />

        <section
          className="flex items-center justify-between gap-3"
          data-testid="shop-results-summary"
        >
          <p className="text-sm mk-muted-text">
            Showing {data.items.length} of {data.total} listing
            {data.total === 1 ? "" : "s"}
          </p>
        </section>

        {data.items.length === 0 ? (
          <section
            className="mk-glass-strong rounded-[2rem] p-8 text-center"
            data-testid="shop-empty-state"
          >
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              No listings match those filters
            </h2>
            <p className="mt-2 text-sm mk-muted-text">
              Try clearing one or more filters to broaden your results.
            </p>
          </section>
        ) : (
          <section
            className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4"
            data-testid="shop-results-grid"
          >
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
      </div>
    </main>
  )
}