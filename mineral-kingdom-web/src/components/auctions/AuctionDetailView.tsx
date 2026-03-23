"use client"

import Image from "next/image"
import { useAuthContext } from "@/components/auth/AuthProvider"
import { AuctionBidPanel } from "@/components/auctions/AuctionBidPanel"
import {
  type AuctionDetailDto,
  fetchAuctionDetailClient,
  formatEndsAt,
  formatMoney,
} from "@/lib/auctions/getAuctionDetail"
import { useCallback, useEffect, useMemo, useState } from "react"

type Props = {
  data: AuctionDetailDto
}

export function AuctionDetailView({ data }: Props) {
  const { me, isLoading } = useAuthContext()
  const [detail, setDetail] = useState(data)

  const primaryMedia = detail.media.find((m) => m.isPrimary) ?? detail.media[0] ?? null

  const refreshDetail = useCallback(async () => {
    const refreshed = await fetchAuctionDetailClient(detail.auctionId)
    if (refreshed) {
      setDetail(refreshed)
    }
  }, [detail.auctionId])

  const authFingerprint = useMemo(() => {
    return JSON.stringify({
      isAuthenticated: me.isAuthenticated,
      emailVerified: me.emailVerified ?? null,
      userId: me.user?.id ?? null,
    })
  }, [me.emailVerified, me.isAuthenticated, me.user?.id])

  useEffect(() => {
    if (isLoading) return

    let cancelled = false

    async function syncDetailForAuthChange() {
      const refreshed = await fetchAuctionDetailClient(detail.auctionId)
      if (!cancelled && refreshed) {
        setDetail(refreshed)
      }
    }

    void syncDetailForAuthChange()

    return () => {
      cancelled = true
    }
  }, [isLoading, authFingerprint, detail.auctionId])

  const showParticipationBanner =
    me.isAuthenticated && detail.hasCurrentUserBid === true

  const showLeadingState =
    showParticipationBanner && detail.isCurrentUserLeading === true

  const showOutbidState =
    showParticipationBanner && detail.isCurrentUserLeading === false

  return (
    <main
      className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"
      data-testid="auction-detail-page"
    >
      <section className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Mineral Kingdom Auctions
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1
            className="text-3xl font-bold tracking-tight text-stone-900"
            data-testid="auction-detail-title"
          >
            {detail.title}
          </h1>
          <span
            className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-800"
            data-testid="auction-detail-status"
          >
            {detail.status}
          </span>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
            data-testid="auction-detail-media"
          >
            <div className="relative aspect-square bg-stone-100">
              {primaryMedia ? (
                <Image
                  src={primaryMedia.url}
                  alt={detail.title}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-stone-500">
                  No media available
                </div>
              )}
            </div>
          </div>

          <section
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            data-testid="auction-detail-description"
          >
            <h2 className="text-lg font-semibold text-stone-900">Description</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-700">
              {detail.description?.trim() || "No description available."}
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <section
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            data-testid="auction-detail-summary"
          >
            <h2 className="text-lg font-semibold text-stone-900">Auction summary</h2>

            <dl className="mt-4 space-y-4 text-sm text-stone-700">
              <div>
                <dt className="font-medium text-stone-500">Current bid</dt>
                <dd
                  className="mt-1 text-base font-semibold text-stone-900"
                  data-testid="auction-detail-price"
                >
                  {formatMoney(detail.currentPriceCents) ?? "—"}
                </dd>
              </div>

              <div>
                <dt className="font-medium text-stone-500">Ends</dt>
                <dd className="mt-1" data-testid="auction-detail-closing-time">
                  {formatEndsAt(detail.closingTimeUtc) ?? "—"}
                </dd>
              </div>

              <div>
                <dt className="font-medium text-stone-500">Minimum next bid</dt>
                <dd className="mt-1" data-testid="auction-detail-minimum-next-bid">
                  {formatMoney(detail.minimumNextBidCents) ?? "—"}
                </dd>
              </div>

              {detail.reserveMet !== null && detail.reserveMet !== undefined ? (
                <div>
                  <dt className="font-medium text-stone-500">Reserve</dt>
                  <dd className="mt-1" data-testid="auction-detail-reserve-state">
                    {detail.reserveMet ? "Met" : "Not met"}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          {showLeadingState ? (
            <section
              className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm"
              data-testid="auction-detail-leading-state"
            >
              <h2 className="text-lg font-semibold text-green-900">You’re currently winning</h2>
              <p className="mt-2 text-sm leading-6 text-green-800">
                Your max bid is active. The visible current bid may stay lower than your maximum
                unless another bidder competes.
              </p>
              {detail.currentUserMaxBidCents != null ? (
                <p
                  className="mt-3 text-sm font-medium text-green-900"
                  data-testid="auction-detail-current-max-bid"
                >
                  Your current max bid: {formatMoney(detail.currentUserMaxBidCents)}
                </p>
              ) : null}
            </section>
          ) : null}

          {showOutbidState ? (
            <section
              className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm"
              data-testid="auction-detail-outbid-state"
            >
              <h2 className="text-lg font-semibold text-amber-950">You’ve been outbid</h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                Another bidder is currently leading this auction. Increase your max bid to compete
                again.
              </p>
              {detail.currentUserMaxBidCents != null ? (
                <p
                  className="mt-3 text-sm font-medium text-amber-950"
                  data-testid="auction-detail-current-max-bid"
                >
                  Your current max bid: {formatMoney(detail.currentUserMaxBidCents)}
                </p>
              ) : null}
            </section>
          ) : null}

          {isLoading ? (
            <section
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
              data-testid="auction-detail-bidding-loading"
            >
              <p className="text-sm text-stone-600">Loading member bidding options…</p>
            </section>
          ) : me.isAuthenticated && me.emailVerified === false ? (
            <section
              className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm"
              data-testid="auction-detail-bidding-unverified"
            >
              <h2 className="text-lg font-semibold text-amber-950">Verify your email to bid</h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                Your account must have a verified email address before you can place a max bid.
              </p>
            </section>
          ) : (
            <AuctionBidPanel
              auctionId={detail.auctionId}
              minimumNextBidCents={detail.minimumNextBidCents}
              currentPriceCents={detail.currentPriceCents}
              isAuthenticated={me.isAuthenticated}
              onBidPlaced={refreshDetail}
            />
          )}
        </div>
      </section>
    </main>
  )
}