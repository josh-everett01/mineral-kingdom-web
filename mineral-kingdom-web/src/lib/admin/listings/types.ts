export type AdminListingPublishChecklist = {
  canPublish: boolean
  missing: string[]
}

export type AdminShippingRateInput = {
  regionCode: "US" | "CA" | "EU" | "AU" | "ROW" | string
  amountCents: number | null
}

export type AdminListingListItem = {
  id: string
  title: string | null
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | string
  primaryMineralId: string | null
  primaryMineralName: string | null
  localityDisplay: string | null
  quantityAvailable: number
  quantityTotal: number
  updatedAt: string
  publishedAt: string | null
  archivedAt: string | null
  publishChecklist: AdminListingPublishChecklist
  commerceState?: "AVAILABLE" | "STORE_OFFER" | "AUCTION" | "SOLD" | "UNAVAILABLE" | string
  isEligibleForStoreOffer?: boolean
  storeOfferIneligibilityReason?: string | null
  isEligibleForAuction?: boolean
  auctionIneligibilityReason?: string | null
  hasActiveStoreOffer?: boolean
  hasAuction?: boolean
  hasNonTerminalAuction?: boolean
  isSold?: boolean
  soldAt?: string | null
  soldVia?: "STORE" | "AUCTION" | string | null
}

export type AdminListingMediaSummary = {
  readyImageCount: number
  primaryReadyImageCount: number
  hasPrimaryVideoViolation: boolean
}

export type AdminListingDetail = {
  id: string
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | string
  title: string | null
  description: string | null
  primaryMineralId: string | null
  primaryMineralName: string | null
  localityDisplay: string | null
  countryCode: string | null
  adminArea1: string | null
  adminArea2: string | null
  mineName: string | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  weightGrams: number | null
  sizeClass: string | null
  isFluorescent: boolean
  fluorescenceNotes: string | null
  conditionNotes: string | null
  isLot: boolean
  quantityTotal: number
  quantityAvailable: number
  shippingRates: AdminShippingRateInput[]
  updatedAt: string
  publishedAt: string | null
  archivedAt: string | null
  mediaSummary: AdminListingMediaSummary
  publishChecklist: AdminListingPublishChecklist
  commerceState?: "AVAILABLE" | "STORE_OFFER" | "AUCTION" | "SOLD" | "UNAVAILABLE" | string
  isEligibleForStoreOffer?: boolean
  storeOfferIneligibilityReason?: string | null
  isEligibleForAuction?: boolean
  auctionIneligibilityReason?: string | null
  hasActiveStoreOffer?: boolean
  hasAuction?: boolean
  hasNonTerminalAuction?: boolean
  isSold?: boolean
  soldAt?: string | null
  soldVia?: "STORE" | "AUCTION" | string | null
}

export type AdminMineralLookupItem = {
  id: string
  name: string
}

export type AdminListingMediaItem = {
  id: string
  mediaType: string
  status: string
  url: string
  isPrimary: boolean
  sortOrder: number
  caption: string | null
  originalFileName: string | null
  contentType: string | null
  contentLengthBytes: number | null
  createdAt: string
  updatedAt: string
}

export type AdminInitiateListingMediaUploadRequest = {
  mediaType: string
  fileName: string
  contentType: string
  contentLengthBytes: number
  isPrimary?: boolean
  sortOrder?: number
  caption?: string | null
}

export type AdminInitiateListingMediaUploadResponse = {
  mediaId: string
  storageKey: string
  uploadUrl: string
  requiredHeaders: Record<string, string>
  expiresAt: string
  publicUrl: string
}
