export type PlaceBidInput = {
  maxBidCents: number
  mode: "IMMEDIATE" | "DELAYED"
}

export type PlaceBidResult =
  | { kind: "ok"; data: unknown }
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
    return {
      kind: "auth-expired",
      message: getMessage(
        body,
        "Your session expired. Please sign in again before placing your max bid.",
      ),
    }
  }

  return {
    kind: "error",
    message: getMessage(body, `Bid request failed (${res.status}).`),
  }
}