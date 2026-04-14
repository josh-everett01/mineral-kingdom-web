import { headers } from "next/headers"

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
  startingPriceCents: number
  bidCount: number
  startTimeUtc?: string | null
  closingTimeUtc: string
  status: string
}

export type AuctionBrowseResponseDto = {
  items: AuctionBrowseItemDto[]
  total: number
  serverTimeUtc: string
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

export function isEndingSoon(
  closingTimeUtc?: string | null,
  serverTimeUtc?: string | null,
): boolean {
  if (!closingTimeUtc || !serverTimeUtc) return false

  const close = new Date(closingTimeUtc)
  const server = new Date(serverTimeUtc)

  if (Number.isNaN(close.getTime()) || Number.isNaN(server.getTime())) return false

  const diffMs = close.getTime() - server.getTime()
  return diffMs > 0 && diffMs <= 60 * 60 * 1000
}