import {
  AdminListingDetail,
  AdminListingListItem,
  AdminMineralLookupItem,
} from "@/lib/admin/listings/types"

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
    // ignore parse issues
  }

  throw new Error(message)
}

export async function getAdminListings(): Promise<AdminListingListItem[]> {
  const response = await fetch("/api/bff/admin/listings", {
    method: "GET",
    cache: "no-store",
  })

  await ensureOk(response, "Failed to load listings.")
  return readJson<AdminListingListItem[]>(response)
}

export async function createAdminDraftListing(): Promise<{ id: string }> {
  const response = await fetch("/api/bff/admin/listings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  })

  await ensureOk(response, "Failed to create draft listing.")

  const body = await readJson<{ id?: string; Id?: string }>(response)
  const id = body?.id ?? body?.Id

  if (!id) {
    throw new Error("Draft listing was created but no id was returned.")
  }

  return { id }
}

export async function getAdminListing(id: string): Promise<AdminListingDetail> {
  const response = await fetch(`/api/bff/admin/listings/${id}`, {
    method: "GET",
    cache: "no-store",
  })

  await ensureOk(response, "Failed to load listing.")
  return readJson<AdminListingDetail>(response)
}

export async function updateAdminListing(
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(`/api/bff/admin/listings/${id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  await ensureOk(response, "Failed to save listing.")
}

export async function publishAdminListing(id: string): Promise<void> {
  const response = await fetch(`/api/bff/admin/listings/${id}/publish`, {
    method: "POST",
  })

  await ensureOk(response, "Failed to publish listing.")
}

export async function archiveAdminListing(id: string): Promise<void> {
  const response = await fetch(`/api/bff/admin/listings/${id}/archive`, {
    method: "POST",
  })

  await ensureOk(response, "Failed to archive listing.")
}

export async function lookupAdminMinerals(query: string): Promise<AdminMineralLookupItem[]> {
  const params = new URLSearchParams()
  if (query.trim()) {
    params.set("query", query.trim())
  }

  const response = await fetch(`/api/bff/admin/minerals?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  })

  await ensureOk(response, "Failed to search minerals.")
  return readJson<AdminMineralLookupItem[]>(response)
}