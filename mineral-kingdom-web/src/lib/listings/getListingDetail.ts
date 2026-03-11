import { headers } from "next/headers"

export type ListingMediaDto = {
  id: string
  mediaType: string
  url: string
  sortOrder: number
  isPrimary: boolean
  caption?: string | null
}

export type ListingDetailDto = {
  id: string
  title?: string | null
  description?: string | null
  status: string
  primaryMineralId?: string | null
  countryCode?: string | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  weightGrams?: number | null
  publishedAt?: string | null
  media: ListingMediaDto[]
}

async function getAppOrigin(): Promise<string> {
  const h = await headers()

  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http")

  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    "localhost:3000"

  return `${proto}://${host}`
}

export async function fetchListingDetail(id: string): Promise<ListingDetailDto | null> {
  const origin = await getAppOrigin()

  const res = await fetch(`${origin}/api/bff/listings/${encodeURIComponent(id)}`, {
    cache: "no-store",
  })

  if (!res.ok) {
    return null
  }

  return (await res.json()) as ListingDetailDto
}