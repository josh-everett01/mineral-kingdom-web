import type {
  CreateSupportTicketRequest,
  CreateSupportTicketResponse,
  SupportTicketDto,
  SupportTicketListItem,
} from "@/lib/support/types"

export async function createSupportTicket(
  request: CreateSupportTicketRequest,
): Promise<CreateSupportTicketResponse> {
  const res = await fetch("/api/bff/support/tickets", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
    cache: "no-store",
  })

  if (!res.ok) {
    let message = "Failed to submit support request."
    try {
      const body = await res.json()
      message = body?.message ?? body?.error ?? message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return res.json() as Promise<CreateSupportTicketResponse>
}

export async function getSupportTicket(
  ticketId: string,
  token?: string,
): Promise<SupportTicketDto> {
  const url = token
    ? `/api/bff/support/tickets/${encodeURIComponent(ticketId)}?token=${encodeURIComponent(token)}`
    : `/api/bff/support/tickets/${encodeURIComponent(ticketId)}`

  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  })

  if (!res.ok) {
    let message = "Failed to load support ticket."
    try {
      const body = await res.json()
      message = body?.message ?? body?.error ?? message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return res.json() as Promise<SupportTicketDto>
}

export async function replySupportTicket(
  ticketId: string,
  message: string,
  token?: string,
): Promise<void> {
  const url = token
    ? `/api/bff/support/tickets/${encodeURIComponent(ticketId)}/messages?token=${encodeURIComponent(token)}`
    : `/api/bff/support/tickets/${encodeURIComponent(ticketId)}/messages`

  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
    cache: "no-store",
  })

  if (!res.ok) {
    let errorMessage = "Failed to send reply."
    try {
      const body = await res.json()
      errorMessage = body?.message ?? body?.error ?? errorMessage
    } catch {
      // ignore
    }
    throw new Error(errorMessage)
  }
}

export async function getMySupportTickets(): Promise<SupportTicketListItem[]> {
  const res = await fetch("/api/bff/support/tickets", {
    credentials: "include",
    cache: "no-store",
  })

  if (!res.ok) {
    let message = "Failed to load support tickets."
    try {
      const body = await res.json()
      message = body?.message ?? body?.error ?? message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return res.json() as Promise<SupportTicketListItem[]>
}
