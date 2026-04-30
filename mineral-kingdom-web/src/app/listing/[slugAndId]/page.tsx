import { notFound } from "next/navigation"

import { ListingImageGallery } from "@/components/listings/ListingImageGallery"
import { ListingPurchaseActions } from "@/components/listings/ListingPurchaseActions"
import { RegionShippingCard } from "@/components/shipping/RegionShippingCard"
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

  const galleryImages = [...listing.media]
    .filter((media: (typeof listing.media)[number]) => media.mediaType === "IMAGE")
    .map((media: (typeof listing.media)[number]) => ({
      id: media.id,
      url: media.url,
      caption: media.caption,
      isPrimary: media.isPrimary,
      sortOrder: media.sortOrder,
    }))

  return (
    <main
      className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
      data-testid="listing-detail-page"
    >
      <div className="mx-auto max-w-[1440px] space-y-8">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <ListingImageGallery
              key={galleryImages.map((image) => image.id).join("|")}
              images={galleryImages}
              title={listing.title ?? "Listing"}
            />
          </div>

          <div className="space-y-6">
            <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
                  Listing
                </p>
                <h1
                  className="text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl"
                  data-testid="listing-detail-title"
                >
                  {listing.title ?? "Untitled listing"}
                </h1>
                <p className="text-sm mk-muted-text">Status: {listing.status}</p>
              </div>
            </section>

            <section className="mk-glass-strong rounded-[2rem] p-5">
              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailItem label="Mineral" value={listing.primaryMineral} testId="listing-detail-mineral" />
                <DetailItem label="Locality" value={listing.localityDisplay} testId="listing-detail-locality" />
                {listing.sizeClass ? (
                  <DetailItem label="Size class" value={listing.sizeClass} testId="listing-detail-size-class" />
                ) : null}
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
                {listing.countryCode ? (
                  <DetailItem label="Country code" value={listing.countryCode} testId="listing-detail-country" />
                ) : null}
                {listing.lengthCm ? (
                  <DetailItem label="Length" value={`${listing.lengthCm} cm`} testId="listing-detail-length" />
                ) : null}
                {listing.widthCm ? (
                  <DetailItem label="Width" value={`${listing.widthCm} cm`} testId="listing-detail-width" />
                ) : null}
                {listing.heightCm ? (
                  <DetailItem label="Height" value={`${listing.heightCm} cm`} testId="listing-detail-height" />
                ) : null}
                {listing.weightGrams ? (
                  <DetailItem label="Weight" value={`${listing.weightGrams} g`} testId="listing-detail-weight" />
                ) : null}
              </dl>
            </section>

            {purchaseContext.showAddToCart && storeOffer ? (
              <section
                className="space-y-4 rounded-[2rem] border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel-muted)] p-5 shadow-sm"
                data-testid="listing-store-offer"
              >
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-success)]">
                    Fixed price
                  </p>

                  {storeOffer.effectivePriceCents < storeOffer.priceCents ? (
                    <div className="space-y-1">
                      <p
                        className="text-3xl font-semibold text-[color:var(--mk-ink)]"
                        data-testid="listing-store-offer-price"
                      >
                        {formatMoney(storeOffer.effectivePriceCents) ?? "—"}
                      </p>
                      <p
                        className="text-sm line-through mk-muted-text"
                        data-testid="listing-store-offer-original-price"
                      >
                        {formatMoney(storeOffer.priceCents)}
                      </p>
                      <p
                        className="text-sm font-semibold text-[color:var(--mk-success)]"
                        data-testid="listing-store-offer-savings"
                      >
                        {storeOffer.discountType === "PERCENT" && storeOffer.discountPercentBps
                          ? `${(storeOffer.discountPercentBps / 100).toFixed(0)}% off`
                          : storeOffer.discountType === "FLAT" && storeOffer.discountCents
                            ? `Save ${formatMoney(storeOffer.discountCents)}`
                            : null}
                      </p>
                    </div>
                  ) : (
                    <p
                      className="text-3xl font-semibold text-[color:var(--mk-ink)]"
                      data-testid="listing-store-offer-price"
                    >
                      {formatMoney(storeOffer.effectivePriceCents) ?? "—"}
                    </p>
                  )}
                </div>

                <ListingPurchaseActions offerId={storeOffer.offerId} />
              </section>
            ) : null}

            {purchaseContext.showAuctionWidget && auction ? (
              <section
                className="space-y-4 rounded-[2rem] border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel-muted)] p-5 shadow-sm"
                data-testid="listing-auction-widget"
              >
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
                    Auction
                  </p>
                  <p
                    className="text-3xl font-semibold text-[color:var(--mk-ink)]"
                    data-testid="listing-auction-current-bid"
                  >
                    {formatMoney(auction.currentPriceCents) ?? "—"}
                  </p>
                </div>

                <dl className="grid gap-4 text-sm sm:grid-cols-2">
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
                </dl>
              </section>
            ) : null}

            <RegionShippingCard
              title="Shipping"
              rates={listing.shippingRates}
              shippingMessage={listing.shippingMessage}
              emptyMessage="Shipping information has not been configured for this listing yet."
              testIdPrefix="listing-detail-shipping"
            />

            {!purchaseContext.showAddToCart && !purchaseContext.showAuctionWidget ? (
              <section className="mk-glass-strong rounded-[2rem] p-5">
                <p className="text-sm mk-muted-text">
                  This listing is not currently available for purchase.
                </p>
              </section>
            ) : null}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <DetailCard title="Description">
            <p className="whitespace-pre-line text-sm leading-6 mk-muted-text">
              {listing.description?.trim() || "No description available yet."}
            </p>
          </DetailCard>

          <DetailCard title="Additional notes">
            <dl className="space-y-4 text-sm">
              {listing.fluorescenceNotes?.trim() ? (
                <div>
                  <dt className="font-semibold text-[color:var(--mk-ink)]">Fluorescence notes</dt>
                  <dd className="mt-1 mk-muted-text" data-testid="listing-detail-fluorescence-notes">
                    {listing.fluorescenceNotes.trim()}
                  </dd>
                </div>
              ) : null}
              {listing.conditionNotes?.trim() ? (
                <div>
                  <dt className="font-semibold text-[color:var(--mk-ink)]">Condition notes</dt>
                  <dd className="mt-1 mk-muted-text" data-testid="listing-detail-condition-notes">
                    {listing.conditionNotes.trim()}
                  </dd>
                </div>
              ) : null}
              {!listing.fluorescenceNotes?.trim() && !listing.conditionNotes?.trim() ? (
                <p className="mk-muted-text">No additional notes available yet.</p>
              ) : null}
            </dl>
          </DetailCard>
        </section>
      </div>
    </main>
  )
}

function DetailCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mk-glass-strong rounded-[2rem] p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
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
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm mk-muted-text" data-testid={testId}>
        {value?.trim() || "—"}
      </dd>
    </div>
  )
}