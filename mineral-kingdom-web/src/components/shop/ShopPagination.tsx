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
      className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
      data-testid="shop-pagination"
    >
      <div className="text-sm text-stone-600">
        Page {page} of {totalPages}
      </div>

      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={buildHref(page - 1, searchParams)}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
            data-testid="shop-pagination-previous"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-400">
            Previous
          </span>
        )}

        {page < totalPages ? (
          <Link
            href={buildHref(page + 1, searchParams)}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
            data-testid="shop-pagination-next"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-400">
            Next
          </span>
        )}
      </div>
    </nav>
  )
}