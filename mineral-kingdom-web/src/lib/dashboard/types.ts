export type DashboardWonAuctionDto = {
  auctionId: string
  listingId: string
  currentPriceCents: number
  closeTime: string
  status: string
}

export type DashboardOrderSummaryDto = {
  orderId: string
  orderNumber: string
  sourceType: string
  status: string
  totalCents: number
  currencyCode: string
  createdAt: string
  paymentDueAt?: string | null
  fulfillmentGroupId?: string | null
}

export type DashboardOpenBoxDto = {
  fulfillmentGroupId: string
  status: string
  updatedAt: string
  orders: DashboardOrderSummaryDto[]
}

export type DashboardShippingInvoiceDto = {
  shippingInvoiceId: string
  fulfillmentGroupId: string
  amountCents: number
  currencyCode: string
  status: string
  provider?: string | null
  providerCheckoutId?: string | null
  paidAt?: string | null
  createdAt: string
}

export type MemberDashboardDto = {
  wonAuctions: DashboardWonAuctionDto[]
  unpaidAuctionOrders: DashboardOrderSummaryDto[]
  paidOrders: DashboardOrderSummaryDto[]
  openBox?: DashboardOpenBoxDto | null
  shippingInvoices: DashboardShippingInvoiceDto[]
}

export type DashboardActionItem = {
  label: string
  href: string
  tone?: "default" | "primary"
}

export type DashboardWidgetRow = {
  id: string
  title: string
  subtitle?: string | null
  meta?: string | null
  action?: DashboardActionItem | null
}

export type DashboardWidgetModel = {
  title: string
  countLabel: string
  countValue: number
  description: string
  rows: DashboardWidgetRow[]
  emptyMessage: string
}