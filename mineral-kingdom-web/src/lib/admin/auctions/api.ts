import {
  AdminAuctionDetail,
  AdminAuctionIdResponse,
  AdminAuctionListItem,
  CreateAdminAuctionRequest,
  UpdateAdminAuctionRequest,
} from "@/lib/admin/auctions/types"

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : (null as T)
}

async function ensureOk(response: Response, fallbackMessage: string) {
  if (response.ok) return

  let message = fallbackMessage
  try {
    const body = await response.json()
    message =
      body?.message ||
      body?.error?.message ||
      body?.error ||
      body?.code ||
      fallbackMessage
  } catch {
    // ignore
  }

  throw new Error(message)
}

export async function getAdminAuctions(params?: {
  status?: string
  search?: string
}): Promise<AdminAuctionListItem[]> {
  const query = new URLSearchParams()
  if (params?.status?.trim()) query.set("status", params.status.trim())
  if (params?.search?.trim()) query.set("search", params.search.trim())

  const response = await fetch(`/api/bff/admin/auctions${query.toString() ? `?${query}` : ""}`, {
    method: "GET",
    cache: "no-store",
  })

  await ensureOk(response, "Failed to load auctions.")
  return readJson<AdminAuctionListItem[]>(response)
}

export async function createAdminAuction(
  payload: CreateAdminAuctionRequest,
): Promise<AdminAuctionIdResponse> {
  const response = await fetch("/api/bff/admin/auctions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  await ensureOk(response, "Failed to create auction.")
  return readJson<AdminAuctionIdResponse>(response)
}

export async function getAdminAuction(id: string): Promise<AdminAuctionDetail> {
  const response = await fetch(`/api/bff/admin/auctions/${id}`, {
    method: "GET",
    cache: "no-store",
  })

  await ensureOk(response, "Failed to load auction.")
  return readJson<AdminAuctionDetail>(response)
}

export async function updateAdminAuction(
  id: string,
  payload: UpdateAdminAuctionRequest,
): Promise<void> {
  const response = await fetch(`/api/bff/admin/auctions/${id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  await ensureOk(response, "Failed to update auction.")
}

export async function startAdminAuction(id: string): Promise<void> {
  const response = await fetch(`/api/bff/admin/auctions/${id}/start`, {
    method: "POST",
  })

  await ensureOk(response, "Failed to start auction.")
}