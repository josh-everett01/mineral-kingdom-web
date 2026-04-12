export type ListingBrowseItemDto = {
  id: string
  slug: string
  href: string
  title: string
  primaryImageUrl?: string | null
  primaryMineral?: string | null
  localityDisplay?: string | null
  sizeClass?: string | null
  isFluorescent: boolean
  listingType: "STORE" | "AUCTION" | string
  priceCents?: number | null
  effectivePriceCents?: number | null
  currentBidCents?: number | null
  endsAt?: string | null
  discountType?: string | null
  discountCents?: number | null
  discountPercentBps?: number | null
}

export type ListingBrowseAvailableFiltersDto = {
  mineralTypes: string[]
  sizeClasses: string[]
}

export type ListingBrowseResponseDto = {
  items: ListingBrowseItemDto[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  availableFilters: ListingBrowseAvailableFiltersDto
}

type BrowseSearchParams = Record<string, string | string[] | undefined>

const ALLOWED_QUERY_KEYS = [
  "page",
  "pageSize",
  "sort",
  "listingType",
  "mineralType",
  "sizeClass",
  "minPrice",
  "maxPrice",
  "fluorescent",
] as const

async function getAppOrigin(): Promise<string> {
  const { headers } = await import("next/headers")
  const h = await headers()

  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http")

  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    "localhost:3000"

  return `${proto}://${host}`
}

function toQueryString(searchParams: BrowseSearchParams): string {
  const qp = new URLSearchParams()

  for (const key of ALLOWED_QUERY_KEYS) {
    const value = searchParams[key]
    if (typeof value === "string" && value.trim().length > 0) {
      qp.set(key, value)
    }
  }

  const query = qp.toString()
  return query.length > 0 ? `?${query}` : ""
}

export async function fetchListings(
  searchParams: BrowseSearchParams,
): Promise<ListingBrowseResponseDto | null> {
  const origin = await getAppOrigin()
  const query = toQueryString(searchParams)


  const res = await fetch(`${origin}/api/bff/listings${query}`, {
    cache: "no-store",
  })

  if (!res.ok) {
    return null
  }

  return (await res.json()) as ListingBrowseResponseDto
}

export function formatMoney(cents?: number | null): string | null {
  if (typeof cents !== "number") return null

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

export function formatEndsAt(value?: string | null): string | null {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}