export type PlaceBidRequest = {
  maxBidCents: number
  mode: "IMMEDIATE"
}

export type PlaceBidResponse = {
  currentPriceCents: number
  leaderUserId?: string | null
  hasReserve: boolean
  reserveMet: boolean
}

export type PlaceBidResult =
  | { kind: "ok"; data: PlaceBidResponse }
  | { kind: "auth"; message: string }
  | { kind: "forbidden"; message: string }
  | { kind: "validation"; message: string }
  | { kind: "error"; message: string }

function getErrorCode(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null

  const maybePayload = payload as {
    error?: unknown
    code?: unknown
    details?: { error?: unknown; code?: unknown } | null
  }

  if (typeof maybePayload.error === "string") return maybePayload.error
  if (typeof maybePayload.code === "string") return maybePayload.code
  if (typeof maybePayload.details?.error === "string") return maybePayload.details.error
  if (typeof maybePayload.details?.code === "string") return maybePayload.details.code

  return null
}

function mapBidError(status: number, payload: unknown): PlaceBidResult {
  const code = getErrorCode(payload)

  if (status === 401) {
    return {
      kind: "auth",
      message: "You must be signed in to place a bid.",
    }
  }

  if (status === 403) {
    return {
      kind: "forbidden",
      message: "You must verify your email before bidding.",
    }
  }

  switch (code) {
    case "BID_TOO_LOW":
      return {
        kind: "validation",
        message: "Your bid is too low. Enter at least the minimum next bid.",
      }
    case "NOT_WHOLE_DOLLARS":
      return {
        kind: "validation",
        message: "Bids must be entered in whole-dollar amounts.",
      }
    case "INVALID_BID":
      return {
        kind: "validation",
        message: "Enter a valid bid amount.",
      }
    case "AUCTION_NOT_BIDDABLE":
    case "AUCTION_CLOSING_WINDOW_EXPIRED":
      return {
        kind: "validation",
        message: "This auction is no longer accepting bids.",
      }
    default:
      return {
        kind: "error",
        message: "We couldn’t place your bid right now.",
      }
  }
}

export async function placeBid(
  auctionId: string,
  request: PlaceBidRequest,
): Promise<PlaceBidResult> {
  const res = await fetch(`/api/bff/auctions/${encodeURIComponent(auctionId)}/bids`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(request),
    cache: "no-store",
  })

  const payload = await res.json().catch(() => null)

  if (!res.ok) {
    return mapBidError(res.status, payload)
  }

  return {
    kind: "ok",
    data: payload as PlaceBidResponse,
  }
}