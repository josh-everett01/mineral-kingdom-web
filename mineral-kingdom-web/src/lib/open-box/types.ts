export type OpenBoxOrderItemDto = {
  orderId: string
  orderNumber: string
  totalCents: number
  currencyCode: string
  status: string
}

export type OpenBoxDto = {
  fulfillmentGroupId: string
  boxStatus?: string | null
  fulfillmentStatus?: string | null
  closedAt?: string | null
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