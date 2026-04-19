export type OpenBoxOrderItemDto = {
  orderId: string
  orderNumber: string
  sourceType: string
  totalCents: number
  currencyCode: string
  status: string
  shippingMode?: string | null
  itemCount: number
  previewTitle?: string | null
  previewImageUrl?: string | null
}

export type OpenBoxDto = {
  fulfillmentGroupId: string
  boxStatus: string
  shipmentRequestStatus: string
  fulfillmentStatus: string
  closedAt: string | null
  orderCount: number
  orders: OpenBoxOrderItemDto[]
}

export type OpenBoxShippingInvoiceDto = {
  shippingInvoiceId: string
  fulfillmentGroupId: string
  amountCents: number
  currencyCode: string
  status: string
}