export type AuctionDetailMediaDto = {
  id: string
  url: string
  isPrimary: boolean
  sortOrder: number
}

export type AuctionDetailDto = {
  auctionId: string
  listingId: string
  title: string
  description?: string | null
  status: string
  currentPriceCents: number
  bidCount: number
  reserveMet?: boolean | null
  closingTimeUtc: string
  minimumNextBidCents: number
  media: AuctionDetailMediaDto[]
  isCurrentUserLeading?: boolean | null
  hasCurrentUserBid?: boolean | null
  currentUserMaxBidCents?: number | null
}

export type AuctionDetailResult =
  | { kind: "ok"; data: AuctionDetailDto }
  | { kind: "not-found" }
  | { kind: "error" }

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

export async function fetchAuctionDetail(auctionId: string): Promise<AuctionDetailResult> {
  const origin = await getAppOrigin()

  const res = await fetch(`${origin}/api/bff/auctions/${encodeURIComponent(auctionId)}`, {
    cache: "no-store",
  })

  if (res.status === 404) {
    return { kind: "not-found" }
  }

  if (!res.ok) {
    return { kind: "error" }
  }

  const data = (await res.json()) as AuctionDetailDto
  return { kind: "ok", data }
}

export async function fetchAuctionDetailClient(
  auctionId: string,
): Promise<AuctionDetailDto | null> {
  const res = await fetch(`/api/bff/auctions/${encodeURIComponent(auctionId)}`, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  })

  if (!res.ok) {
    return null
  }

  return (await res.json()) as AuctionDetailDto
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