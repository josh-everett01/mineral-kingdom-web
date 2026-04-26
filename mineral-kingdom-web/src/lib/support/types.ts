export const SUPPORT_TICKET_CATEGORIES = [
  "ORDER_HELP",
  "AUCTION_HELP",
  "SHIPPING_HELP",
  "OPEN_BOX_HELP",
  "PAYMENT_HELP",
  "OTHER",
] as const

export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number]

export const SUPPORT_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  ORDER_HELP: "Order help",
  AUCTION_HELP: "Auction help",
  SHIPPING_HELP: "Shipping help",
  OPEN_BOX_HELP: "Open Box help",
  PAYMENT_HELP: "Payment help",
  OTHER: "Other",
}

export type CreateSupportTicketRequest = {
  subject: string
  category: string
  message: string
  linkedOrderId?: string | null
  linkedAuctionId?: string | null
  linkedShippingInvoiceId?: string | null
  linkedListingId?: string | null
  guestEmail?: string | null
}

export type CreateSupportTicketResponse = {
  ticketId: string
  ticketNumber: string
  guestAccessToken: string | null
}

/**
 * Describes the single contextual entity this support request is about.
 * At most one linked entity is allowed per ticket.
 */
export type SupportLinkedContext =
  | { type: "order"; id: string }
  | { type: "shippingInvoice"; id: string }
  | { type: "auction"; id: string }
  | { type: "listing"; id: string }
  | { type: "none" }

export type SupportTicketMessageDto = {
  id: string
  authorType: "CUSTOMER" | "SUPPORT"
  authorUserId: string | null
  bodyText: string
  isInternalNote: boolean
  createdAt: string
}

export type SupportTicketDto = {
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
  messages: SupportTicketMessageDto[]
}

export type SupportTicketListItem = {
  id: string
  ticketNumber: string
  subject: string
  category: string
  priority: string
  status: string
  assignedToUserId: string | null
  createdAt: string
  updatedAt: string
}
