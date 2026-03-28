import { emitAuthExpired } from "@/lib/auth/clientSessionEvents"

export type PlaceBidInput = {
  maxBidCents: number
  mode: "IMMEDIATE" | "DELAYED"
}

export type PlaceBidResult =
  | { kind: "ok"; data: unknown }
  | { kind: "auth-expired"; message: string }
  | { kind: "error"; message: string }

export type CancelDelayedBidResult =
  | { kind: "ok" }
  | { kind: "auth-expired"; message: string }
  | { kind: "error"; message: string }

function getMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    if ("message" in body) {
      const message = (body as { message?: unknown }).message
      if (typeof message === "string" && message.trim().length > 0) {
        return message
      }
    }

    if ("error" in body) {
      const error = (body as { error?: unknown }).error
      if (typeof error === "string" && error.trim().length > 0) {
        return error
      }
    }
  }

  return fallback
}

export async function placeBid(
  auctionId: string,
  input: PlaceBidInput,
): Promise<PlaceBidResult> {
  let res: Response

  try {
    res = await fetch(`/api/bff/auctions/${encodeURIComponent(auctionId)}/bids`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(input),
    })
  } catch {
    return {
      kind: "error",
      message: "We couldn’t place your bid right now.",
    }
  }

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (res.ok) {
    return {
      kind: "ok",
      data: body,
    }
  }

  if (res.status === 401) {
    const message = getMessage(
      body,
      "Your session expired. Please sign in again before placing your max bid.",
    )
    emitAuthExpired(message)

    return {
      kind: "auth-expired",
      message,
    }
  }

  return {
    kind: "error",
    message: getMessage(body, `Bid request failed (${res.status}).`),
  }
}

export async function cancelDelayedBid(
  auctionId: string,
): Promise<CancelDelayedBidResult> {
  let res: Response

  try {
    res = await fetch(`/api/bff/auctions/${encodeURIComponent(auctionId)}/delayed-bid`, {
      method: "DELETE",
      headers: {
        accept: "application/json",
      },
    })
  } catch {
    return {
      kind: "error",
      message: "We couldn’t cancel your delayed bid right now.",
    }
  }

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (res.ok) {
    return { kind: "ok" }
  }

  if (res.status === 401) {
    const message = getMessage(
      body,
      "Your session expired. Please sign in again before cancelling your delayed bid.",
    )
    emitAuthExpired(message)

    return {
      kind: "auth-expired",
      message,
    }
  }

  return {
    kind: "error",
    message: getMessage(body, `Delayed bid cancel request failed (${res.status}).`),
  }
}