import { emitAuthExpired } from "@/lib/auth/clientSessionEvents"

export type AuctionDetailMediaDto = {
  id: string
  url: string
  mediaType: string
  caption?: string | null
  isPrimary: boolean
  sortOrder: number
}

export type AuctionDetailPaymentVisibilityState = "NONE" | "PAYMENT_DUE" | "PAID"

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
  quotedShippingCents?: number | null
  media: AuctionDetailMediaDto[]
  isCurrentUserLeading?: boolean | null
  hasCurrentUserBid?: boolean | null
  currentUserMaxBidCents?: number | null
  currentUserBidState?: "NONE" | "LEADING" | "OUTBID" | null
  hasPendingDelayedBid?: boolean | null
  currentUserDelayedBidCents?: number | null
  currentUserDelayedBidStatus?: "NONE" | "SCHEDULED" | "MOOT" | "ACTIVATED" | null
  isCurrentUserWinner?: boolean | null
  paymentOrderId?: string | null
  paymentVisibilityState?: AuctionDetailPaymentVisibilityState | null
}

export type AuctionDetailResult =
  | { kind: "ok"; data: AuctionDetailDto }
  | { kind: "not-found" }
  | { kind: "auth-expired"; message: string }
  | { kind: "error"; message: string }

function getMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message
    if (typeof message === "string" && message.trim().length > 0) {
      return message
    }
  }

  return fallback
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

export async function fetchAuctionDetail(auctionId: string): Promise<AuctionDetailResult> {
  const origin = await getAppOrigin()

  const res = await fetch(`${origin}/api/bff/auctions/${encodeURIComponent(auctionId)}`, {
    cache: "no-store",
  })

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (res.status === 404) {
    return { kind: "not-found" }
  }

  if (res.status === 401) {
    return {
      kind: "auth-expired",
      message: getMessage(body, "Your session expired. Please sign in again."),
    }
  }

  if (!res.ok) {
    return {
      kind: "error",
      message: getMessage(body, "We couldn’t load this auction right now."),
    }
  }

  return { kind: "ok", data: body as AuctionDetailDto }
}

export async function fetchAuctionDetailClient(
  auctionId: string,
): Promise<AuctionDetailResult> {
  let res: Response

  try {
    res = await fetch(`/api/bff/auctions/${encodeURIComponent(auctionId)}`, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    })
  } catch {
    return {
      kind: "error",
      message: "We couldn’t load this auction right now.",
    }
  }

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (res.status === 404) {
    return { kind: "not-found" }
  }

  if (res.status === 401) {
    const message = getMessage(body, "Your session expired. Please sign in again.")
    emitAuthExpired(message)

    return {
      kind: "auth-expired",
      message,
    }
  }

  if (!res.ok) {
    return {
      kind: "error",
      message: getMessage(body, `Auction detail request failed (${res.status}).`),
    }
  }

  return { kind: "ok", data: body as AuctionDetailDto }
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