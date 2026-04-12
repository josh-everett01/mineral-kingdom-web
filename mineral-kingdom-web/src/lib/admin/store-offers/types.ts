export type DiscountType = "NONE" | "FLAT" | "PERCENT" | string

export type AdminStoreOfferListItem = {
  id: string
  listingId: string
  listingTitle: string | null
  listingStatus: string
  priceCents: number
  discountType: DiscountType
  discountCents: number | null
  discountPercentBps: number | null
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  effectivePriceCents: number
  createdAt: string
  updatedAt: string
}

export type UpsertStoreOfferPayload = {
  listingId: string
  priceCents: number
  discountType: string
  discountCents: number | null
  discountPercentBps: number | null
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
}

export type UpdateStoreOfferPayload = {
  priceCents: number
  discountType: string
  discountCents: number | null
  discountPercentBps: number | null
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
}