export type AdminShippingInvoiceOrder = {
  orderId: string
  orderNumber: string
  sourceType: string | null
}

export type AdminShippingInvoiceItem = {
  orderId: string
  orderNumber: string | null
  sourceType: string | null
  listingId: string
  listingSlug: string | null
  title: string
  primaryImageUrl: string | null
  mineralName: string | null
  locality: string | null
  quantity: number
}

export type AdminShippingInvoiceDetail = {
  shippingInvoiceId: string
  fulfillmentGroupId: string
  amountCents: number
  currencyCode: string
  status: string
  provider: string | null
  providerCheckoutId: string | null
  paidAt: string | null
  dueAt: string | null
  createdAt: string
  updatedAt: string
  itemCount: number
  previewTitle: string | null
  previewImageUrl: string | null
  auctionOrderCount: number
  storeOrderCount: number
  relatedOrders: AdminShippingInvoiceOrder[]
  items: AdminShippingInvoiceItem[]
}