import type {
  AdminSupportTicketDetail,
  AdminSupportTicketListItem,
  CreateAdminSupportMessageRequest,
  GetAdminSupportTicketsParams,
  UpdateAdminSupportTicketRequest,
} from "@/lib/admin/support/types"

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Request failed."
    try {
      const body = await response.json()
      message = body?.message ?? body?.error ?? message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export async function getAdminSupportTickets(
  params?: GetAdminSupportTicketsParams,
): Promise<AdminSupportTicketListItem[]> {
  const search = new URLSearchParams()

  if (params?.status?.trim()) search.set("status", params.status.trim())
  if (params?.priority?.trim()) search.set("priority", params.priority.trim())
  if (params?.assignedToUserId?.trim()) search.set("assignedToUserId", params.assignedToUserId.trim())
  if (params?.q?.trim()) search.set("q", params.q.trim())
  if (typeof params?.page === "number") search.set("page", String(params.page))
  if (typeof params?.pageSize === "number") search.set("pageSize", String(params.pageSize))

  const url = search.size > 0
    ? `/api/bff/admin/support/tickets?${search.toString()}`
    : "/api/bff/admin/support/tickets"

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<AdminSupportTicketListItem[]>(response)
}

export async function getAdminSupportTicket(ticketId: string): Promise<AdminSupportTicketDetail> {
  const response = await fetch(`/api/bff/admin/support/tickets/${ticketId}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<AdminSupportTicketDetail>(response)
}

export async function updateAdminSupportTicket(
  ticketId: string,
  request: UpdateAdminSupportTicketRequest,
): Promise<void> {
  const response = await fetch(`/api/bff/admin/support/tickets/${ticketId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    let message = "Ticket update failed."
    try {
      const body = await response.json()
      message = body?.message ?? body?.error ?? message
    } catch {
      // ignore
    }
    throw new Error(message)
  }
}

export async function createAdminSupportTicketMessage(
  ticketId: string,
  request: CreateAdminSupportMessageRequest,
): Promise<void> {
  const response = await fetch(`/api/bff/admin/support/tickets/${ticketId}/messages`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    let message = "Message send failed."
    try {
      const body = await response.json()
      message = body?.message ?? body?.error ?? message
    } catch {
      // ignore
    }
    throw new Error(message)
  }
}