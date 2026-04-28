export type HomeSectionItemDto = {
  listingId: string
  auctionId?: string | null
  title: string
  primaryImageUrl?: string | null
  priceCents?: number | null
  effectivePriceCents?: number | null
  currentBidCents?: number | null
  startingPriceCents?: number | null
  endsAt?: string | null
  startTime?: string | null
  status?: string | null
  href: string
  discountType?: string | null
  discountCents?: number | null
  discountPercentBps?: number | null
}

export type HomeSectionDto = {
  title: string
  browseHref: string
  count: number
  items: HomeSectionItemDto[]
}

export type HomeSectionsDto = {
  featuredListings: HomeSectionDto
  endingSoonAuctions: HomeSectionDto
  upcomingAuctions: HomeSectionDto
  newArrivals: HomeSectionDto
}

export async function fetchHomeSections(): Promise<HomeSectionsDto | null> {
  const apiBase =
    process.env.API_BASE_URL ?? "http://localhost:8080"

  const res = await fetch(`${apiBase}/api/home/sections`, {
    cache: "no-store",
  })

  if (!res.ok) {
    return null
  }

  return (await res.json()) as HomeSectionsDto
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

export function formatStartsAt(value?: string | null): string | null {
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
