import { headers } from "next/headers"

export type ListingMediaDto = {
  id: string
  mediaType: string
  url: string
  sortOrder: number
  isPrimary: boolean
  caption?: string | null
}

export type ListingDetailDto = {
  id: string
  title?: string | null
  description?: string | null
  status: string
  primaryMineralId?: string | null
  primaryMineral?: string | null
  localityDisplay?: string | null
  countryCode?: string | null
  sizeClass?: string | null
  isFluorescent: boolean
  fluorescenceNotes?: string | null
  conditionNotes?: string | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  weightGrams?: number | null
  publishedAt?: string | null
  media: ListingMediaDto[]
}

export type AggregatedListingDetailDto = {
  listing: ListingDetailDto
  storeOffer: {
    offerId: string
    priceCents: number
    effectivePriceCents: number
    discountType: string
    discountCents?: number | null
    discountPercentBps?: number | null
    isPurchasable: boolean
  } | null
  auction: {
    auctionId: string
    currentPriceCents: number
    bidCount: number
    reserveMet?: boolean | null
    status: string
    closingWindowEnd?: string | null
    minimumNextBidCents?: number | null
  } | null
  purchaseContext: {
    mode: "STORE" | "AUCTION" | "NONE"
    showAddToCart: boolean
    showAuctionWidget: boolean
  }
  canonicalHref: string
}

async function getAppOrigin(): Promise<string> {
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

export async function fetchListingDetail(id: string): Promise<AggregatedListingDetailDto | null> {
  const origin = await getAppOrigin()

  const res = await fetch(`${origin}/api/bff/listings/${encodeURIComponent(id)}`, {
    cache: "no-store",
  })

  if (!res.ok) {
    return null
  }

  return (await res.json()) as AggregatedListingDetailDto
}

export function formatMoney(cents?: number | null): string | null {
  if (typeof cents !== "number") return null

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}

export function formatDateTime(value?: string | null): string | null {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}