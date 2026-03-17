import { notFound } from "next/navigation"
import { ListingPurchaseActions } from "@/components/listings/ListingPurchaseActions"
import { fetchListingDetail, formatDateTime, formatMoney } from "@/lib/listings/getListingDetail"

type Props = {
  params: Promise<{ slugAndId: string }>
}

function extractGuid(slugAndId: string): string | null {
  const match = slugAndId.match(
    /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/,
  )

  return match ? match[1] : null
}

export default async function ListingDetailPage({ params }: Props) {
  const { slugAndId } = await params
  const id = extractGuid(slugAndId)

  if (!id) {
    notFound()
  }

  const data = await fetchListingDetail(id)

  if (!data) {
    notFound()
  }

  const { listing, storeOffer, auction, purchaseContext } = data
  const media = [...listing.media].sort((a, b) => {
    if (a.isPrimary === b.isPrimary) return a.sortOrder - b.sortOrder
    return a.isPrimary ? -1 : 1
  })

  const primaryImage = media[0]
  const galleryImages = media.slice(1)

  return (
    <main
      className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"
      data-testid="listing-detail-page"
    >
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="aspect-square bg-stone-100">
              {primaryImage?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={primaryImage.url}
                  alt={listing.title ?? "Listing image"}
                  className="h-full w-full object-cover"
                  data-testid="listing-detail-primary-image"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-stone-500">
                  No image available
                </div>
              )}
            </div>
          </div>

          {galleryImages.length > 0 ? (
            <div
              className="grid grid-cols-2 gap-4 sm:grid-cols-3"
              data-testid="listing-detail-gallery"
            >
              {galleryImages.map((image) => (
                <div
                  key={image.id}
                  className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
                >
                  <div className="aspect-square bg-stone-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.caption ?? listing.title ?? "Listing gallery image"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Listing
            </p>
            <h1
              className="text-3xl font-bold tracking-tight text-stone-900"
              data-testid="listing-detail-title"
            >
              {listing.title ?? "Untitled listing"}
            </h1>
            <p className="text-sm text-stone-500">Status: {listing.status}</p>
          </div>

          <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-2">
            <DetailItem label="Mineral" value={listing.primaryMineral} testId="listing-detail-mineral" />
            <DetailItem label="Locality" value={listing.localityDisplay} testId="listing-detail-locality" />
            <DetailItem label="Size class" value={listing.sizeClass} testId="listing-detail-size-class" />
            <DetailItem
              label="Fluorescent"
              value={listing.isFluorescent ? "Yes" : "No"}
              testId="listing-detail-fluorescent"
            />
            <DetailItem
              label="Published"
              value={formatDateTime(listing.publishedAt)}
              testId="listing-detail-published"
            />
            <DetailItem label="Country code" value={listing.countryCode} testId="listing-detail-country" />
            <DetailItem
              label="Length"
              value={listing.lengthCm ? `${listing.lengthCm} cm` : null}
              testId="listing-detail-length"
            />
            <DetailItem
              label="Width"
              value={listing.widthCm ? `${listing.widthCm} cm` : null}
              testId="listing-detail-width"
            />
            <DetailItem
              label="Height"
              value={listing.heightCm ? `${listing.heightCm} cm` : null}
              testId="listing-detail-height"
            />
            <DetailItem
              label="Weight"
              value={listing.weightGrams ? `${listing.weightGrams} g` : null}
              testId="listing-detail-weight"
            />
          </div>

          {purchaseContext.showAddToCart && storeOffer ? (
            <section
              className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"
              data-testid="listing-store-offer"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                  Fixed price
                </p>
                <p className="text-2xl font-bold text-emerald-900" data-testid="listing-store-offer-price">
                  {formatMoney(storeOffer.effectivePriceCents) ?? "—"}
                </p>
                {storeOffer.effectivePriceCents < storeOffer.priceCents ? (
                  <p className="text-sm text-emerald-800">
                    <span className="line-through">{formatMoney(storeOffer.priceCents)}</span>
                  </p>
                ) : null}
              </div>

              <ListingPurchaseActions offerId={storeOffer.offerId} />
            </section>
          ) : null}

          {purchaseContext.showAuctionWidget && auction ? (
            <section
              className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm"
              data-testid="listing-auction-widget"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                  Auction
                </p>
                <p className="text-2xl font-bold text-amber-900" data-testid="listing-auction-current-bid">
                  {formatMoney(auction.currentPriceCents) ?? "—"}
                </p>
              </div>

              <div className="grid gap-3 text-sm text-amber-950 sm:grid-cols-2">
                <DetailItem label="Status" value={auction.status} testId="listing-auction-status" />
                <DetailItem
                  label="Bid count"
                  value={String(auction.bidCount)}
                  testId="listing-auction-bid-count"
                />
                <DetailItem
                  label="Reserve met"
                  value={
                    typeof auction.reserveMet === "boolean"
                      ? auction.reserveMet ? "Yes" : "No"
                      : "—"
                  }
                  testId="listing-auction-reserve-met"
                />
                <DetailItem
                  label="Minimum next bid"
                  value={formatMoney(auction.minimumNextBidCents)}
                  testId="listing-auction-min-next-bid"
                />
                <DetailItem
                  label="Closing window end"
                  value={formatDateTime(auction.closingWindowEnd)}
                  testId="listing-auction-closing-window"
                />
              </div>
            </section>
          ) : null}

          {!purchaseContext.showAddToCart && !purchaseContext.showAuctionWidget ? (
            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-stone-600">
                This listing is not currently available for purchase.
              </p>
            </section>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Description</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-700">
            {listing.description?.trim() || "No description available yet."}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Additional notes</h2>
          <dl className="mt-3 space-y-3 text-sm text-stone-700">
            <div>
              <dt className="font-medium text-stone-900">Fluorescence notes</dt>
              <dd data-testid="listing-detail-fluorescence-notes">
                {listing.fluorescenceNotes?.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-stone-900">Condition notes</dt>
              <dd data-testid="listing-detail-condition-notes">
                {listing.conditionNotes?.trim() || "—"}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  )
}

function DetailItem({
  label,
  value,
  testId,
}: {
  label: string
  value?: string | null
  testId?: string
}) {
  return (
    <div>
      <dt className="font-medium text-stone-900">{label}</dt>
      <dd className="mt-1 text-stone-700" data-testid={testId}>
        {value?.trim() || "—"}
      </dd>
    </div>
  )
}