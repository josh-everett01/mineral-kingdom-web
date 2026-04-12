import {
  AdminStoreOfferListItem,
  UpdateStoreOfferPayload,
  UpsertStoreOfferPayload,
} from "@/lib/admin/store-offers/types"

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

export async function getAdminStoreOffers(listingId?: string): Promise<AdminStoreOfferListItem[]> {
  const params = new URLSearchParams()
  if (listingId?.trim()) {
    params.set("listingId", listingId.trim())
  }

  const query = params.toString()
  const response = await fetch(`/api/bff/admin/store/offers${query ? `?${query}` : ""}`, {
    method: "GET",
    cache: "no-store",
  })

  await ensureOk(response, "Failed to load store offers.")
  return readJson<AdminStoreOfferListItem[]>(response)
}

export async function createOrUpsertAdminStoreOffer(
  payload: UpsertStoreOfferPayload,
): Promise<{ id: string }> {
  const response = await fetch("/api/bff/admin/store/offers", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  await ensureOk(response, "Failed to save store offer.")
  const body = await readJson<{ id?: string; Id?: string }>(response)
  const id = body?.id ?? body?.Id

  if (!id) {
    throw new Error("Store offer saved but no id was returned.")
  }

  return { id }
}

export async function updateAdminStoreOffer(
  id: string,
  payload: UpdateStoreOfferPayload,
): Promise<void> {
  const response = await fetch(`/api/bff/admin/store/offers/${id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  await ensureOk(response, "Failed to update store offer.")
}