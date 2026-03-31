export type OpenBoxOrderItemDto = {
  orderId: string
  orderNumber: string
  sourceType: string
  status: string
  totalCents: number
  currencyCode: string
  createdAt: string
  previewTitle?: string | null
  previewImageUrl?: string | null
  itemCount: number
  mineralName?: string | null
  locality?: string | null
}

export type OpenBoxDto = {
  fulfillmentGroupId: string
  status: string
  boxStatus?: string | null
  updatedAt: string
  closedAt?: string | null
  orders: OpenBoxOrderItemDto[]
}

export type OpenBoxShippingInvoiceDto = {
  shippingInvoiceId: string
  fulfillmentGroupId: string
  amountCents: number
  currencyCode: string
  status: string
}