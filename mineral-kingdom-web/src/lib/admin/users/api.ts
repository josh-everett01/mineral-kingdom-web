import type {
  AdminUserDetail,
  AdminUserListItem,
  GetAdminUsersParams,
  UpdateAdminUserRoleRequest,
} from "@/lib/admin/users/types"

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

export async function getAdminUsers(params?: GetAdminUsersParams): Promise<AdminUserListItem[]> {
  const search = new URLSearchParams()

  if (params?.email?.trim()) {
    search.set("email", params.email.trim())
  }

  const url = search.size > 0
    ? `/api/bff/admin/users?${search.toString()}`
    : "/api/bff/admin/users"

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<AdminUserListItem[]>(response)
}

export async function getAdminUser(userId: string): Promise<AdminUserDetail> {
  const response = await fetch(`/api/bff/admin/users/${encodeURIComponent(userId)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<AdminUserDetail>(response)
}

export async function updateAdminUserRole(
  userId: string,
  request: UpdateAdminUserRoleRequest,
): Promise<void> {
  const response = await fetch(`/api/bff/admin/users/${encodeURIComponent(userId)}/role`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    let message = "Role update failed."

    try {
      const body = await response.json()
      message = body?.message ?? body?.details?.error ?? body?.error ?? message
    } catch {
      // ignore
    }

    throw new Error(message)
  }
}