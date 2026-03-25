"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAuthContext } from "@/components/auth/AuthProvider"
import { AuctionBidPanel } from "@/components/auctions/AuctionBidPanel"
import {
  type AuctionDetailDto,
  fetchAuctionDetailClient,
  formatEndsAt,
  formatMoney,
} from "@/lib/auctions/getAuctionDetail"
import { useAuctionRealtime } from "@/lib/auctions/useAuctionRealtime"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type Props = {
  data: AuctionDetailDto
}

type ActivityItem = {
  id: string
  message: string
  createdAt: number
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

  const primaryMedia = detail.media.find((m) => m.isPrimary) ?? detail.media[0] ?? null
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

  const showLeadingState = !authMismatch && currentUserBidState === "LEADING"
  const showOutbidState = !authMismatch && currentUserBidState === "OUTBID"

  const showDelayedScheduledState =
    !authMismatch &&
    detail.hasPendingDelayedBid === true &&
    delayedBidStatus === "SCHEDULED"

  const showDelayedMootState =
    !authMismatch &&
    detail.hasPendingDelayedBid === true &&
    delayedBidStatus === "MOOT"

  const showDelayedActivatedState =
    !authMismatch &&
    detail.hasPendingDelayedBid === true &&
    delayedBidStatus === "ACTIVATED"

  function goToLogin() {
    const returnTo = encodeURIComponent(`/auctions/${detail.auctionId}`)
    router.push(`/login?returnTo=${returnTo}`)
  }

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

          <section
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
            data-testid="auction-detail-activity"
          >
            <h2 className="text-lg font-semibold text-stone-900">Recent bid activity</h2>

            {activity.length === 0 ? (
              <p
                className="mt-3 text-sm text-stone-600"
                data-testid="auction-detail-activity-empty"
              >
                Live auction activity will appear here as bidding changes.
              </p>
            ) : (
              <ul className="mt-3 space-y-3" data-testid="auction-detail-activity-list">
                {activity.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-700"
                  >
                    {item.message}
                  </li>
                ))}
              </ul>
            )}
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

            <div
              className="mt-4 text-xs text-stone-500"
              data-testid="auction-detail-live-status"
            >
              {connected
                ? "Live auction updates connected."
                : connecting
                  ? "Connecting to live auction updates…"
                  : "Live updates temporarily disconnected."}
            </div>
          </section>

          {authMismatch ? (
            <section
              className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm"
              data-testid="auction-detail-session-expired"
            >
              <h2 className="text-lg font-semibold text-amber-950">Your session expired</h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                {sessionExpiredMessage}
              </p>
              <button
                type="button"
                onClick={goToLogin}
                className="mt-4 inline-flex rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
                data-testid="auction-detail-sign-in-again"
              >
                Sign in again
              </button>
            </section>
          ) : null}

          {!authMismatch && showLeadingState ? (
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

          {!authMismatch && showOutbidState ? (
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

          {!authMismatch && showDelayedScheduledState ? (
            <section
              className="rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-sm"
              data-testid="auction-detail-delayed-scheduled-state"
            >
              <h2 className="text-lg font-semibold text-sky-900">Your delayed bid is scheduled</h2>
              <p className="mt-2 text-sm leading-6 text-sky-800">
                Immediate max bids are active now. Your delayed bid is saved now and will activate
                when the auction enters closing.
              </p>
              {detail.currentUserDelayedBidCents != null ? (
                <p
                  className="mt-3 text-sm font-medium text-sky-900"
                  data-testid="auction-detail-delayed-bid-amount"
                >
                  Delayed bid amount: {formatMoney(detail.currentUserDelayedBidCents)}
                </p>
              ) : null}
              <p className="mt-3 text-sm leading-6 text-sky-800">
                You may keep one delayed bid per auction. You may also place immediate bids while
                your delayed bid remains scheduled.
              </p>
              <p className="mt-1 text-sm leading-6 text-sky-800">
                Submitting a new delayed bid replaces your previous delayed bid, and you may cancel
                it before it activates.
              </p>
            </section>
          ) : null}

          {!authMismatch && showDelayedMootState ? (
            <section
              className="rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-sm"
              data-testid="auction-detail-delayed-moot-state"
            >
              <h2 className="text-lg font-semibold text-orange-950">
                Your delayed bid is no longer needed
              </h2>
              <p className="mt-2 text-sm leading-6 text-orange-900">
                The live auction state has already exceeded or superseded your delayed bid.
              </p>
              {detail.currentUserDelayedBidCents != null ? (
                <p
                  className="mt-3 text-sm font-medium text-orange-950"
                  data-testid="auction-detail-delayed-bid-amount"
                >
                  Delayed bid amount: {formatMoney(detail.currentUserDelayedBidCents)}
                </p>
              ) : null}
              <p className="mt-3 text-sm leading-6 text-orange-900">
                You can still place immediate bids now, and you can submit another delayed bid above
                the current price if the auction is still eligible.
              </p>
            </section>
          ) : null}

          {!authMismatch && showDelayedActivatedState ? (
            <section
              className="rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm"
              data-testid="auction-detail-delayed-activated-state"
            >
              <h2 className="text-lg font-semibold text-violet-900">
                Your delayed bid has activated
              </h2>
              <p className="mt-2 text-sm leading-6 text-violet-800">
                Your delayed bid is now participating in the live auction. Immediate max bids remain
                active now, and delayed bids activate at closing.
              </p>
              {detail.currentUserDelayedBidCents != null ? (
                <p
                  className="mt-3 text-sm font-medium text-violet-900"
                  data-testid="auction-detail-delayed-bid-amount"
                >
                  Delayed bid amount: {formatMoney(detail.currentUserDelayedBidCents)}
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
          ) : authMismatch ? null : me.isAuthenticated && me.emailVerified === false ? (
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
              hasPendingDelayedBid={detail.hasPendingDelayedBid}
              currentUserDelayedBidCents={detail.currentUserDelayedBidCents}
              currentUserDelayedBidStatus={detail.currentUserDelayedBidStatus}
              onBidPlaced={refreshDetail}
              onDelayedBidCancelled={refreshDetail}
            />
          )}
        </div>
      </section>
    </main>
  )
}