"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"

import { useAuthContext } from "@/components/auth/AuthProvider"
import { AuctionBidPanel } from "@/components/auctions/AuctionBidPanel"
import { RegionShippingCard } from "@/components/shipping/RegionShippingCard"
import { ListingImageGallery } from "@/components/listings/ListingImageGallery"
import {
  type AuctionDetailDto,
  fetchAuctionDetailClient,
  formatMoney,
} from "@/lib/auctions/getAuctionDetail"
import { LocalTime } from "@/components/ui/LocalTime"
import { useAuctionRealtime } from "@/lib/auctions/useAuctionRealtime"

type Props = {
  data: AuctionDetailDto
}

type ActivityItem = {
  id: string
  message: string
  createdAt: number
}

function isClosedAuctionStatus(status?: string | null) {
  if (!status) return false

  return (
    status === "CLOSED_WAITING_ON_PAYMENT" ||
    status === "CLOSED_PAID" ||
    status === "CLOSED_NOT_SOLD"
  )
}

function formatBidHistoryTime(value?: string | null) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function AuctionDetailView({ data }: Props) {
  const router = useRouter()
  const { me, isLoading } = useAuthContext()
  const [detail, setDetail] = useState(data)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [sessionExpired, setSessionExpired] = useState(false)
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(
    "Your session expired. Please sign in again.",
  )

  const galleryImages = useMemo(() => {
    return [...detail.media]
      .filter((media: (typeof detail.media)[number]) => media.mediaType === "IMAGE")
      .map((media: (typeof detail.media)[number]) => ({
        id: media.id,
        url: media.url,
        caption: media.caption,
        isPrimary: media.isPrimary,
        sortOrder: media.sortOrder,
      }))
  }, [detail])

  const activityIdRef = useRef(0)

  const lastPublicStateRef = useRef({
    currentPriceCents: data.currentPriceCents,
    reserveMet: data.reserveMet ?? null,
    status: data.status,
    closingTimeUtc: data.closingTimeUtc,
    minimumNextBidCents: data.minimumNextBidCents,
  })

  const { connected, connecting, lastEventAt } = useAuctionRealtime(detail.auctionId)

  function nextActivityId(prefix: string) {
    activityIdRef.current += 1
    return `${prefix}-${Date.now()}-${activityIdRef.current}`
  }

  const applyDetailWithActivity = useCallback((nextDetail: AuctionDetailDto) => {
    const previous = lastPublicStateRef.current
    const nextActivity: ActivityItem[] = []

    if (nextDetail.currentPriceCents > previous.currentPriceCents) {
      nextActivity.push({
        id: nextActivityId("price"),
        message: `Current bid increased to ${formatMoney(nextDetail.currentPriceCents) ?? "—"}.`,
        createdAt: Date.now(),
      })
    }

    if ((previous.reserveMet ?? false) === false && nextDetail.reserveMet === true) {
      nextActivity.push({
        id: nextActivityId("reserve"),
        message: "Reserve met.",
        createdAt: Date.now(),
      })
    }

    if (
      typeof nextDetail.status === "string" &&
      nextDetail.status.length > 0 &&
      nextDetail.status !== previous.status
    ) {
      nextActivity.push({
        id: nextActivityId("status"),
        message: `Auction status changed to ${nextDetail.status}.`,
        createdAt: Date.now(),
      })
    }

    if (nextActivity.length > 0) {
      setActivity((prev) => [...nextActivity, ...prev].slice(0, 8))
    }

    setDetail(nextDetail)

    lastPublicStateRef.current = {
      currentPriceCents: nextDetail.currentPriceCents,
      reserveMet: nextDetail.reserveMet ?? null,
      status: nextDetail.status,
      closingTimeUtc: nextDetail.closingTimeUtc,
      minimumNextBidCents: nextDetail.minimumNextBidCents,
    }
  }, [])

  const refreshDetail = useCallback(async () => {
    const refreshed = await fetchAuctionDetailClient(detail.auctionId)

    if (refreshed.kind === "ok") {
      setSessionExpired(false)
      applyDetailWithActivity(refreshed.data)
      return
    }

    if (refreshed.kind === "auth-expired") {
      setSessionExpired(true)
      setSessionExpiredMessage(refreshed.message)
    }
  }, [applyDetailWithActivity, detail.auctionId])

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
      if (cancelled) return

      if (refreshed.kind === "ok") {
        setSessionExpired(false)
        applyDetailWithActivity(refreshed.data)
        return
      }

      if (refreshed.kind === "auth-expired") {
        setSessionExpired(true)
        setSessionExpiredMessage(refreshed.message)
      }
    }

    void syncDetailForAuthChange()

    return () => {
      cancelled = true
    }
  }, [applyDetailWithActivity, authFingerprint, detail.auctionId, isLoading])

  useEffect(() => {
    if (!lastEventAt) return

    let cancelled = false
    const timerId = window.setTimeout(() => {
      if (!cancelled) {
        void refreshDetail()
      }
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timerId)
    }
  }, [lastEventAt, refreshDetail])

  const authMismatch = sessionExpired
  const currentUserBidState = detail.currentUserBidState ?? null
  const delayedBidStatus = detail.currentUserDelayedBidStatus ?? "NONE"
  const paymentVisibilityState = detail.paymentVisibilityState ?? "NONE"
  const closedAuction = isClosedAuctionStatus(detail.status)

  const showLeadingState =
    !authMismatch && !closedAuction && currentUserBidState === "LEADING"
  const showOutbidState =
    !authMismatch && !closedAuction && currentUserBidState === "OUTBID"

  const showDelayedScheduledState =
    !authMismatch &&
    !closedAuction &&
    detail.hasPendingDelayedBid === true &&
    delayedBidStatus === "SCHEDULED"

  const showDelayedMootState =
    !authMismatch &&
    !closedAuction &&
    detail.hasPendingDelayedBid === true &&
    delayedBidStatus === "MOOT"

  const showDelayedActivatedState =
    !authMismatch &&
    !closedAuction &&
    detail.hasPendingDelayedBid === true &&
    delayedBidStatus === "ACTIVATED"

  const showWinnerPaymentDueState =
    !authMismatch &&
    closedAuction &&
    detail.isCurrentUserWinner === true &&
    paymentVisibilityState === "PAYMENT_DUE" &&
    Boolean(detail.paymentOrderId)

  const showWinnerPaidState =
    !authMismatch &&
    closedAuction &&
    detail.isCurrentUserWinner === true &&
    paymentVisibilityState === "PAID" &&
    Boolean(detail.paymentOrderId)

  const showClosedNonWinnerState =
    !authMismatch &&
    closedAuction &&
    !showWinnerPaymentDueState &&
    !showWinnerPaidState

  function goToLogin() {
    const returnTo = encodeURIComponent(`/auctions/${detail.auctionId}`)
    router.push(`/login?returnTo=${returnTo}`)
  }

  function goToOrder(orderId: string) {
    router.push(`/orders/${encodeURIComponent(orderId)}`)
  }

  return (
    <main
      className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
      data-testid="auction-detail-page"
    >
      <div className="mx-auto max-w-[1440px] space-y-8">
        <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
            Mineral Kingdom Auctions
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1
              className="text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl"
              data-testid="auction-detail-title"
            >
              {detail.title}
            </h1>
            <span
              className="rounded-full border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--mk-gold)]"
              data-testid="auction-detail-status"
            >
              {detail.status}
            </span>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div data-testid="auction-detail-media">
              <ListingImageGallery
                key={galleryImages.map((image) => image.id).join("|")}
                images={galleryImages}
                title={detail.title}
              />
            </div>

            <DetailCard title="Description" testId="auction-detail-description">
              <p className="whitespace-pre-line text-sm leading-6 mk-muted-text">
                {detail.description?.trim() || "No description available."}
              </p>
            </DetailCard>

            <DetailCard title="Live activity" testId="auction-detail-activity">
              {activity.length === 0 ? (
                <p className="text-sm mk-muted-text" data-testid="auction-detail-activity-empty">
                  Live auction activity will appear here as bidding changes.
                </p>
              ) : (
                <ul className="space-y-3" data-testid="auction-detail-activity-list">
                  {activity.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-3 py-3 text-sm mk-muted-text"
                    >
                      {item.message}
                    </li>
                  ))}
                </ul>
              )}
            </DetailCard>
          </div>

          <div className="space-y-4">
            <DetailCard title="Auction summary" testId="auction-detail-summary">
              <dl className="space-y-4 text-sm">
                <SummaryItem label="Current bid" testId="auction-detail-price">
                  <span className="text-lg font-semibold text-[color:var(--mk-gold)]">
                    {formatMoney(detail.currentPriceCents) ?? "—"}
                  </span>
                </SummaryItem>

                <SummaryItem label="Ends" testId="auction-detail-closing-time">
                  <LocalTime value={detail.closingTimeUtc} />
                </SummaryItem>

                <SummaryItem label="Minimum next bid" testId="auction-detail-minimum-next-bid">
                  {formatMoney(detail.minimumNextBidCents) ?? "—"}
                </SummaryItem>

                <SummaryItem label="Bid count" testId="auction-detail-bid-count">
                  {detail.bidCount}
                </SummaryItem>

                {detail.reserveMet !== null && detail.reserveMet !== undefined ? (
                  <SummaryItem label="Reserve" testId="auction-detail-reserve-state">
                    {detail.reserveMet ? "Met" : "Not met"}
                  </SummaryItem>
                ) : null}
              </dl>

              <div className="mt-4 text-xs mk-muted-text" data-testid="auction-detail-live-status">
                {connected
                  ? "Live auction updates connected."
                  : connecting
                    ? "Connecting to live auction updates…"
                    : "Live updates temporarily disconnected."}
              </div>
            </DetailCard>

            <RegionShippingCard
              title="Shipping"
              rates={detail.shippingRates}
              shippingMessage={detail.shippingMessage}
              fallbackQuotedShippingCents={detail.quotedShippingCents}
              emptyMessage="Shipping information has not been configured for this auction yet."
              testIdPrefix="auction-detail-shipping"
            />

            <DetailCard title="Recent bid history" testId="auction-detail-bid-history">
              {detail.bidHistory.length === 0 ? (
                <p className="text-sm mk-muted-text" data-testid="auction-detail-bid-history-empty">
                  No public bid history yet.
                </p>
              ) : (
                <ul className="space-y-3" data-testid="auction-detail-bid-history-list">
                  {detail.bidHistory.map((item, index) => (
                    <li
                      key={`${item.bidderLabel}-${item.occurredAt}-${index}`}
                      className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-4 py-3"
                      data-testid={`auction-detail-bid-history-row-${index}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[color:var(--mk-ink)]">
                            {item.bidderLabel}
                          </p>
                          <p className="mt-1 text-xs mk-muted-text">
                            {formatBidHistoryTime(item.occurredAt)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-[color:var(--mk-gold)]">
                          {formatMoney(item.amountCents) ?? "—"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DetailCard>

            {authMismatch ? (
              <StateCard
                tone="warning"
                title="Your session expired"
                message={sessionExpiredMessage}
                testId="auction-detail-session-expired"
              >
                <button
                  type="button"
                  onClick={goToLogin}
                  className="mk-cta mt-4 inline-flex rounded-2xl px-4 py-2 text-sm font-semibold"
                  data-testid="auction-detail-sign-in-again"
                >
                  Sign in again
                </button>
              </StateCard>
            ) : null}

            {!authMismatch && showWinnerPaymentDueState ? (
              <StateCard
                tone="info"
                title="You won this auction"
                message="Payment is due for this auction order. Continue to your order to complete payment."
                testId="auction-detail-winner-payment-due"
              >
                <button
                  type="button"
                  onClick={() => goToOrder(detail.paymentOrderId!)}
                  className="mk-cta mt-4 inline-flex rounded-2xl px-4 py-2 text-sm font-semibold"
                  data-testid="auction-detail-pay-now"
                >
                  Pay Now
                </button>
              </StateCard>
            ) : null}

            {!authMismatch && showWinnerPaidState ? (
              <StateCard
                tone="success"
                title="You won this auction"
                message="Payment for this auction order has already been completed."
                testId="auction-detail-winner-paid"
              >
                <button
                  type="button"
                  onClick={() => goToOrder(detail.paymentOrderId!)}
                  className="mk-cta mt-4 inline-flex rounded-2xl px-4 py-2 text-sm font-semibold"
                  data-testid="auction-detail-view-order"
                >
                  View Order
                </button>
              </StateCard>
            ) : null}

            {!authMismatch && showClosedNonWinnerState ? (
              <StateCard
                tone="neutral"
                title="This auction has closed"
                message="This auction is no longer accepting bids. Payment actions are available only to the winning member when payment is due."
                testId="auction-detail-closed-non-winner"
              />
            ) : null}

            {!authMismatch && showLeadingState ? (
              <StateCard
                tone="success"
                title="You’re currently winning"
                message="Your max bid is active. The visible current bid may stay lower than your maximum unless another bidder competes."
                testId="auction-detail-leading-state"
              >
                {detail.currentUserMaxBidCents != null ? (
                  <p
                    className="mt-3 text-sm font-semibold text-[color:var(--mk-success)]"
                    data-testid="auction-detail-current-max-bid"
                  >
                    Your current max bid: {formatMoney(detail.currentUserMaxBidCents)}
                  </p>
                ) : null}
              </StateCard>
            ) : null}

            {!authMismatch && showOutbidState ? (
              <StateCard
                tone="warning"
                title="You’ve been outbid"
                message="Another bidder is currently leading this auction. Increase your max bid to compete again."
                testId="auction-detail-outbid-state"
              >
                {detail.currentUserMaxBidCents != null ? (
                  <p
                    className="mt-3 text-sm font-semibold text-[color:var(--mk-gold)]"
                    data-testid="auction-detail-current-max-bid"
                  >
                    Your current max bid: {formatMoney(detail.currentUserMaxBidCents)}
                  </p>
                ) : null}
              </StateCard>
            ) : null}

            {!authMismatch && showDelayedScheduledState ? (
              <StateCard
                tone="info"
                title="Your delayed bid is scheduled"
                message="Immediate max bids are active now. Your delayed bid is saved now and will activate when the auction enters closing."
                testId="auction-detail-delayed-scheduled-state"
              >
                {detail.currentUserDelayedBidCents != null ? (
                  <p
                    className="mt-3 text-sm font-semibold text-[color:var(--mk-cyan)]"
                    data-testid="auction-detail-delayed-bid-amount"
                  >
                    Delayed bid amount: {formatMoney(detail.currentUserDelayedBidCents)}
                  </p>
                ) : null}
                <p className="mt-3 text-sm leading-6 mk-muted-text">
                  You may keep one delayed bid per auction. You may also place immediate bids while
                  your delayed bid remains scheduled.
                </p>
                <p className="mt-1 text-sm leading-6 mk-muted-text">
                  Submitting a new delayed bid replaces your previous delayed bid, and you may cancel
                  it before it activates.
                </p>
              </StateCard>
            ) : null}

            {!authMismatch && showDelayedMootState ? (
              <StateCard
                tone="warning"
                title="Your delayed bid is no longer needed"
                message="The live auction state has already exceeded or superseded your delayed bid."
                testId="auction-detail-delayed-moot-state"
              >
                {detail.currentUserDelayedBidCents != null ? (
                  <p
                    className="mt-3 text-sm font-semibold text-[color:var(--mk-gold)]"
                    data-testid="auction-detail-delayed-bid-amount"
                  >
                    Delayed bid amount: {formatMoney(detail.currentUserDelayedBidCents)}
                  </p>
                ) : null}
                <p className="mt-3 text-sm leading-6 mk-muted-text">
                  You can still place immediate bids now, and you can submit another delayed bid above
                  the current price if the auction is still eligible.
                </p>
              </StateCard>
            ) : null}

            {!authMismatch && showDelayedActivatedState ? (
              <StateCard
                tone="info"
                title="Your delayed bid has activated"
                message="Your delayed bid is now participating in the live auction. Immediate max bids remain active now, and delayed bids activate at closing."
                testId="auction-detail-delayed-activated-state"
              >
                {detail.currentUserDelayedBidCents != null ? (
                  <p
                    className="mt-3 text-sm font-semibold text-[color:var(--mk-cyan)]"
                    data-testid="auction-detail-delayed-bid-amount"
                  >
                    Delayed bid amount: {formatMoney(detail.currentUserDelayedBidCents)}
                  </p>
                ) : null}
              </StateCard>
            ) : null}

            {isLoading ? (
              <DetailCard title="Bidding" testId="auction-detail-bidding-loading">
                <p className="text-sm mk-muted-text">Loading member bidding options…</p>
              </DetailCard>
            ) : authMismatch ? null : me.isAuthenticated && me.emailVerified === false ? (
              <StateCard
                tone="warning"
                title="Verify your email to bid"
                message="Your account must have a verified email address before you can place a max bid."
                testId="auction-detail-bidding-unverified"
              />
            ) : closedAuction ? null : (
              <AuctionBidPanel
                auctionId={detail.auctionId}
                minimumNextBidCents={detail.minimumNextBidCents}
                currentPriceCents={detail.currentPriceCents}
                isAuthenticated={me.isAuthenticated}
                hasPendingDelayedBid={detail.hasPendingDelayedBid}
                currentUserDelayedBidCents={detail.currentUserDelayedBidCents}
                currentUserDelayedBidStatus={detail.currentUserDelayedBidStatus}
                onBidPlaced={refreshDetail}
                onDelayedBidCancelled={refreshDetail}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function DetailCard({
  title,
  testId,
  children,
}: {
  title: string
  testId: string
  children: ReactNode
}) {
  return (
    <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-6" data-testid={testId}>
      <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function SummaryItem({
  label,
  testId,
  children,
}: {
  label: string
  testId: string
  children: ReactNode
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
        {label}
      </dt>
      <dd className="mt-1 mk-muted-text" data-testid={testId}>
        {children}
      </dd>
    </div>
  )
}

function StateCard({
  tone,
  title,
  message,
  testId,
  children,
}: {
  tone: "neutral" | "success" | "warning" | "info"
  title: string
  message: string
  testId: string
  children?: ReactNode
}) {
  const toneClass =
    tone === "success"
      ? "border-[color:var(--mk-success)]/40"
      : tone === "warning"
        ? "border-[color:var(--mk-border-strong)]"
        : tone === "info"
          ? "border-[color:var(--mk-cyan)]/40"
          : "border-[color:var(--mk-border)]"

  return (
    <section
      className={`rounded-[2rem] border ${toneClass} bg-[color:var(--mk-panel-muted)] p-5 shadow-sm`}
      data-testid={testId}
    >
      <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">{title}</h2>
      <p className="mt-2 text-sm leading-6 mk-muted-text">{message}</p>
      {children}
    </section>
  )
}