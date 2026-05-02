import Link from "next/link"

type Props = {
  page: number
  totalPages: number
  searchParams: Record<string, string | string[] | undefined>
}

function buildHref(
  page: number,
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const qp = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "listingType") continue

    if (typeof value === "string" && value.length > 0) {
      qp.set(key, value)
    }
  }

  qp.set("page", String(page))
  return `/shop?${qp.toString()}`
}

export function ShopPagination({ page, totalPages, searchParams }: Props) {
  if (totalPages <= 1) return null

  return (
    <nav
      className="mk-glass-strong flex items-center justify-between rounded-[2rem] p-4"
      data-testid="shop-pagination"
    >
      <div className="text-sm mk-muted-text">
        Page {page} of {totalPages}
      </div>

      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={buildHref(page - 1, searchParams)}
            className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] shadow-sm transition hover:bg-[color:var(--mk-panel-muted)]"
            data-testid="shop-pagination-previous"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-2xl border border-[color:var(--mk-border)] px-4 py-2 text-sm mk-muted-text opacity-50">
            Previous
          </span>
        )}

        {page < totalPages ? (
          <Link
            href={buildHref(page + 1, searchParams)}
            className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] shadow-sm transition hover:bg-[color:var(--mk-panel-muted)]"
            data-testid="shop-pagination-next"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-2xl border border-[color:var(--mk-border)] px-4 py-2 text-sm mk-muted-text opacity-50">
            Next
          </span>
        )}
      </div>
    </nav>
  )
}