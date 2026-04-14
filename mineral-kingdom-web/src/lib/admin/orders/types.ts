export type AdminOrderListItem = {
  id: string
  orderNumber: string
  status: string
  sourceType: string
  customerEmail: string | null
  currencyCode: string
  subtotalCents: number
  discountTotalCents: number
  shippingAmountCents: number
  totalCents: number
  paymentDueAt: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
  totalRefundedCents: number
  remainingRefundableCents: number
  isFullyRefunded: boolean
  isPartiallyRefunded: boolean
}

export type AdminOrdersResponse = {
  items: AdminOrderListItem[]
  total: number
}

export type AdminOrderPaymentSummary = {
  provider: string
  status: string
  amountCents: number
  currencyCode: string
  providerPaymentId: string | null
  providerCheckoutId: string | null
  createdAt: string
  updatedAt: string
}

export type AdminOrderRefundHistoryItem = {
  refundId: string
  amountCents: number
  currencyCode: string
  provider: string
  providerRefundId: string | null
  reason: string | null
  createdAt: string
}

export type AdminOrderDetail = {
  id: string
  orderNumber: string
  status: string
  sourceType: string
  userId: string | null
  guestEmail: string | null
  customerEmail: string | null
  currencyCode: string
  subtotalCents: number
  discountTotalCents: number
  shippingAmountCents: number
  totalCents: number
  paymentDueAt: string | null
  paidAt: string | null
  auctionId: string | null
  shippingMode: string | null
  totalRefundedCents: number
  remainingRefundableCents: number
  isFullyRefunded: boolean
  isPartiallyRefunded: boolean
  canRefund: boolean
  availableRefundProviders: string[]
  payments: AdminOrderPaymentSummary[]
  refundHistory: AdminOrderRefundHistoryItem[]
  createdAt: string
  updatedAt: string
}

export type CreateAdminRefundRequest = {
  amountCents: number
  reason: string
  provider: string
}