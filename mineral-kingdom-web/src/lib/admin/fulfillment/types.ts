export type AdminFulfillmentListItem = {
  fulfillmentGroupId: string
  userId: string | null
  boxStatus: string
  shipmentRequestStatus: string
  shipmentRequestedAt: string | null
  shipmentReviewedAt: string | null
  shipmentReviewedByUserId: string | null
  fulfillmentStatus: string
  createdAt: string
  updatedAt: string
  orderCount: number

  shippingInvoiceId?: string | null
  shippingInvoiceStatus?: string | null
  shippingInvoicePaidAt?: string | null

  queueState: string
}

export type AdminFulfillmentGroupOrder = {
  orderId: string
  orderNumber: string
  totalCents: number
  currencyCode: string
  status: string
}

export type AdminFulfillmentInvoiceSummary = {
  shippingInvoiceId: string
  amountCents: number
  currencyCode: string
  status: string
  paidAt: string | null
  createdAt: string
  updatedAt: string
  calculatedAmountCents?: number | null
  isOverride?: boolean
  overrideReason?: string | null
}

export type AdminFulfillmentGroupDetail = {
  fulfillmentGroupId: string
  boxStatus: string
  shipmentRequestStatus: string
  shipmentRequestedAt: string | null
  shipmentReviewedAt: string | null
  shipmentReviewedByUserId: string | null
  fulfillmentStatus: string
  closedAt: string | null

  packedAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  shippingCarrier?: string | null
  trackingNumber?: string | null

  orderCount: number
  orders: AdminFulfillmentGroupOrder[]
  shippingInvoice: AdminFulfillmentInvoiceSummary | null
  calculatedShippingCents?: number | null
  currencyCode?: string | null
  requiresShippingInvoice?: boolean
}

export type AdminCreateShippingInvoiceResult = {
  shippingInvoiceId: string
  fulfillmentGroupId: string
  amountCents: number
  currencyCode: string
  status: string
  paidAt: string | null
  createdAt: string
  updatedAt: string
  calculatedAmountCents?: number | null
  isOverride?: boolean
  overrideReason?: string | null
}