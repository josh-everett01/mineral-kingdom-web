export const SUPPORT_TICKET_STATUSES = [
  "OPEN",
  "WAITING_ON_CUSTOMER",
  "WAITING_ON_SUPPORT",
  "RESOLVED",
  "CLOSED",
] as const

export const SUPPORT_TICKET_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const

export type SupportTicketStatus = typeof SUPPORT_TICKET_STATUSES[number]
export type SupportTicketPriority = typeof SUPPORT_TICKET_PRIORITIES[number]

export type AdminSupportTicketListItem = {
  id: string
  ticketNumber: string
  subject: string
  category: string
  priority: string
  status: string
  assignedToUserId: string | null
  createdByUserId: string | null
  guestEmail: string | null
  updatedAt: string
}

export type AdminSupportTicketMessage = {
  id: string
  authorType: string
  authorUserId: string | null
  bodyText: string
  isInternalNote: boolean
  createdAt: string
}

export type AdminSupportTicketDetail = {
  id: string
  ticketNumber: string
  createdByUserId: string | null
  guestEmail: string | null
  subject: string
  category: string
  priority: string
  status: string
  assignedToUserId: string | null
  linkedOrderId: string | null
  linkedAuctionId: string | null
  linkedShippingInvoiceId: string | null
  linkedListingId: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
  messages: AdminSupportTicketMessage[]
}

export type GetAdminSupportTicketsParams = {
  status?: string
  priority?: string
  assignedToUserId?: string
  q?: string
  page?: number
  pageSize?: number
}

export type UpdateAdminSupportTicketRequest = {
  status?: string | null
  priority?: string | null
  assignedToUserId?: string | null
}

export type CreateAdminSupportMessageRequest = {
  message: string
  isInternalNote?: boolean
}