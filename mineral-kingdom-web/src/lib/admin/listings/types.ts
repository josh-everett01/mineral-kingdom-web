export type AdminListingPublishChecklist = {
  canPublish: boolean
  missing: string[]
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
  updatedAt: string
  publishedAt: string | null
  archivedAt: string | null
  mediaSummary: AdminListingMediaSummary
  publishChecklist: AdminListingPublishChecklist
}

export type AdminMineralLookupItem = {
  id: string
  name: string
}