export type AdminShippingRateInput = {
  regionCode: "US" | "CA" | "EU" | "AU" | "ROW" | string
  amountCents: number | null
}

export type AdminAuctionListItem = {
  id: string
  listingId: string
  listingTitle: string | null
  status: string
  startingPriceCents: number
  currentPriceCents: number
  reservePriceCents: number | null
  hasReserve: boolean
  reserveMet: boolean | null
  bidCount: number
  startTime: string | null
  closeTime: string
  closingWindowEnd: string | null
  quotedShippingCents: number | null
  relistOfAuctionId: string | null
  createdAt: string
  updatedAt: string
}

export type AdminAuctionDetail = {
  auctionId: string
  listingId: string
  listingTitle: string | null
  status: string
  startingPriceCents: number
  currentPriceCents: number
  reservePriceCents: number | null
  hasReserve: boolean
  reserveMet: boolean | null
  bidCount: number
  startTime: string | null
  closeTime: string
  closingWindowEnd: string | null
  quotedShippingCents: number | null
  shippingRates: AdminShippingRateInput[]
  relistOfAuctionId: string | null
  replacementAuctionId: string | null
  createdAt: string
  updatedAt: string
  serverTimeUtc: string
  isCloseDue: boolean
  secondsUntilCloseDue: number
  isClosingWindowDue: boolean
  secondsUntilClosingWindowDue: number | null
  isRelistDue: boolean
  secondsUntilRelistDue: number
}

export type CreateAdminAuctionRequest = {
  listingId: string
  startingPriceCents: number
  reservePriceCents: number | null
  quotedShippingCents: number | null
  shippingRates: AdminShippingRateInput[] | null
  launchMode: "DRAFT" | "NOW" | "SCHEDULED"
  timingMode: "PRESET_DURATION" | "MANUAL"
  durationHours: number | null
  startTime: string | null
  closeTime: string | null
}

export type UpdateAdminAuctionRequest = {
  startTime: string | null
  closeTime: string | null
  startingPriceCents: number | null
  reservePriceCents: number | null
  quotedShippingCents: number | null
  shippingRates?: AdminShippingRateInput[] | null
}

export type AdminAuctionIdResponse = {
  id: string
}