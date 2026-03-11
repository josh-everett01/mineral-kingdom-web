import { NextResponse } from "next/server"
import { toProxyError } from "@/lib/api/proxyError"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"

function safeJsonParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

type ListingDetailDto = {
  id: string
  title?: string | null
  description?: string | null
  status: string
  primaryMineralId?: string | null
  primaryMineral?: string | null
  localityDisplay?: string | null
  countryCode?: string | null
  sizeClass?: string | null
  isFluorescent: boolean
  fluorescenceNotes?: string | null
  conditionNotes?: string | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  weightGrams?: number | null
  publishedAt?: string | null
  media: Array<{
    id: string
    mediaType: string
    url: string
    sortOrder: number
    isPrimary: boolean
    caption?: string | null
  }>
}

type StoreOfferDto = {
  id: string
  listingId: string
  priceCents: number
  discountType: string
  discountCents?: number | null
  discountPercentBps?: number | null
  isActive: boolean
  startsAt?: string | null
  endsAt?: string | null
}

type AuctionSummaryDto = {
  auctionId: string
  currentPriceCents: number
  bidCount: number
  reserveMet?: boolean | null
  status: string
  closingWindowEnd?: string | null
  minimumNextBidCents?: number | null
}

type AggregatedListingDetailDto = {
  listing: ListingDetailDto
  storeOffer: {
    offerId: string
    priceCents: number
    effectivePriceCents: number
    discountType: string
    discountCents?: number | null
    discountPercentBps?: number | null
    isPurchasable: boolean
  } | null
  auction: AuctionSummaryDto | null
  purchaseContext: {
    mode: "STORE" | "AUCTION" | "NONE"
    showAddToCart: boolean
    showAuctionWidget: boolean
  }
  canonicalHref: string
}

function buildCanonicalHref(id: string, title?: string | null): string {
  const source = (title ?? "listing").trim().toLowerCase()
  const slug = source
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "listing"

  return `/listing/${slug}-${id}`
}

function computeEffectivePriceCents(offer: StoreOfferDto): number {
  const base = offer.priceCents

  switch ((offer.discountType ?? "NONE").toUpperCase()) {
    case "FLAT": {
      const discount = offer.discountCents ?? 0
      return Math.max(0, base - discount)
    }
    case "PERCENT": {
      const bps = offer.discountPercentBps ?? 0
      return Math.max(0, Math.floor(base - (base * bps) / 10000))
    }
    default:
      return base
  }
}

async function fetchJson<T>(url: string): Promise<{ ok: true; data: T } | { ok: false; status: number; body: unknown }> {
  let response: Response
  try {
    response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    })
  } catch (e) {
    return {
      ok: false,
      status: 503,
      body: {
        code: "UPSTREAM_UNAVAILABLE",
        message: e instanceof Error ? e.message : "Upstream fetch failed",
      },
    }
  }

  const text = await response.text().catch(() => "")
  const body = safeJsonParse(text)

  if (!response.ok) {
    return { ok: false, status: response.status, body }
  }

  return { ok: true, data: body as T }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params

  const listingResult = await fetchJson<ListingDetailDto>(
    `${API_BASE_URL}/api/listings/${encodeURIComponent(id)}`,
  )

  if (!listingResult.ok) {
    if (listingResult.status === 404) {
      return NextResponse.json(
        {
          status: 404,
          code: "LISTING_NOT_FOUND",
          message: "Listing not found.",
        },
        { status: 404 },
      )
    }

    const err = toProxyError(
      listingResult.status,
      listingResult.body,
      `Upstream request failed (${listingResult.status})`,
    )

    return NextResponse.json(err, { status: listingResult.status })
  }

  const [storeOfferResult, auctionResult] = await Promise.all([
    fetchJson<StoreOfferDto>(`${API_BASE_URL}/api/store/offers/${encodeURIComponent(id)}`),
    fetchJson<AuctionSummaryDto>(`${API_BASE_URL}/api/listings/${encodeURIComponent(id)}/auction`),
  ])

  const storeOffer =
    storeOfferResult.ok
      ? {
          offerId: storeOfferResult.data.id,
          priceCents: storeOfferResult.data.priceCents,
          effectivePriceCents: computeEffectivePriceCents(storeOfferResult.data),
          discountType: storeOfferResult.data.discountType,
          discountCents: storeOfferResult.data.discountCents ?? null,
          discountPercentBps: storeOfferResult.data.discountPercentBps ?? null,
          isPurchasable: storeOfferResult.data.isActive,
        }
      : storeOfferResult.status === 404
        ? null
        : null

  const auction =
    auctionResult.ok
      ? auctionResult.data
      : auctionResult.status === 404
        ? null
        : null

  const purchaseContext: AggregatedListingDetailDto["purchaseContext"] =
    storeOffer?.isPurchasable
      ? {
          mode: "STORE",
          showAddToCart: true,
          showAuctionWidget: false,
        }
      : auction
        ? {
            mode: "AUCTION",
            showAddToCart: false,
            showAuctionWidget: true,
          }
        : {
            mode: "NONE",
            showAddToCart: false,
            showAuctionWidget: false,
          }

  const payload: AggregatedListingDetailDto = {
    listing: listingResult.data,
    storeOffer,
    auction,
    purchaseContext,
    canonicalHref: buildCanonicalHref(listingResult.data.id, listingResult.data.title),
  }

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "cache-control": "no-store",
    },
  })
}