export type AuctionBrowseItemDto = {
  id: string
  listingId: string
  title: string
  slug: string
  href: string
  primaryImageUrl?: string | null
  localityDisplay?: string | null
  sizeClass?: string | null
  isFluorescent: boolean
  currentPriceCents: number
  bidCount: number
  closingTimeUtc: string
  status: string
}

export type AuctionBrowseResponseDto = {
  items: AuctionBrowseItemDto[]
  total: number
  serverTimeUtc: string
}

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

export async function fetchAuctions(): Promise<AuctionBrowseResponseDto | null> {
  const origin = await getAppOrigin()

  const res = await fetch(`${origin}/api/bff/auctions`, {
    cache: "no-store",
  })

  if (!res.ok) {
    return null
  }

  return (await res.json()) as AuctionBrowseResponseDto
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

export function isEndingSoon(
  closingTimeUtc: string,
  serverTimeUtc: string,
  thresholdMinutes = 60,
): boolean {
  const closingTime = new Date(closingTimeUtc)
  const serverTime = new Date(serverTimeUtc)

  if (Number.isNaN(closingTime.getTime()) || Number.isNaN(serverTime.getTime())) {
    return false
  }

  const diffMs = closingTime.getTime() - serverTime.getTime()
  return diffMs > 0 && diffMs <= thresholdMinutes * 60 * 1000
}