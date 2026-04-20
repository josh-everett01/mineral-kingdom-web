import type {
  AdminCmsPageDetail,
  AdminCmsPageListItem,
  PublishRevisionRequest,
  UpsertDraftRequest,
  UpsertDraftResponse,
} from "@/lib/admin/cms/types"

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Request failed."

    try {
      const body = await response.json()
      message = body?.message ?? body?.details?.error ?? body?.error ?? message
    } catch {
      // ignore
    }

    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export async function getAdminCmsPages(): Promise<AdminCmsPageListItem[]> {
  const response = await fetch("/api/bff/admin/pages", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<AdminCmsPageListItem[]>(response)
}

export async function getAdminCmsPage(slug: string): Promise<AdminCmsPageDetail> {
  const response = await fetch(`/api/bff/admin/pages/${encodeURIComponent(slug)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<AdminCmsPageDetail>(response)
}

export async function saveAdminCmsDraft(
  slug: string,
  request: UpsertDraftRequest,
): Promise<UpsertDraftResponse> {
  const response = await fetch(`/api/bff/admin/pages/${encodeURIComponent(slug)}/draft`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  })

  return readJson<UpsertDraftResponse>(response)
}

export async function publishAdminCmsRevision(
  slug: string,
  request: PublishRevisionRequest,
): Promise<void> {
  const response = await fetch(`/api/bff/admin/pages/${encodeURIComponent(slug)}/publish`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    let message = "Publish failed."

    try {
      const body = await response.json()
      message = body?.message ?? body?.details?.error ?? body?.error ?? message
    } catch {
      // ignore
    }

    throw new Error(message)
  }
}