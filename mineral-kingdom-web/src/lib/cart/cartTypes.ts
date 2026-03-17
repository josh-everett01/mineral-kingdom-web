export type CartNoticeDto = {
  id: string
  type: string
  message: string
  offerId?: string | null
  listingId?: string | null
  createdAt: string
  dismissedAt?: string | null
}

export type CartLineDto = {
  offerId: string
  listingId: string
  listingHref: string
  title: string
  primaryImageUrl?: string | null
  quantity: number
  quantityAvailable: number
  priceCents: number
  effectivePriceCents: number
  canUpdateQuantity: boolean
}

export type CartDto = {
  cartId: string
  userId?: string | null
  status: string
  subtotalCents: number
  warnings: string[]
  notices: CartNoticeDto[]
  lines: CartLineDto[]
}