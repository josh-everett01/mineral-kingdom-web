"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { cancelDelayedBid, placeBid } from "@/lib/auctions/placeBid"
import { formatMoney } from "@/lib/auctions/getAuctionDetail"

type BidMode = "IMMEDIATE" | "DELAYED"

type Props = {
  auctionId: string
  minimumNextBidCents: number
  currentPriceCents: number
  isAuthenticated: boolean
  hasPendingDelayedBid?: boolean | null
  currentUserDelayedBidCents?: number | null
  currentUserDelayedBidStatus?: "NONE" | "SCHEDULED" | "MOOT" | "ACTIVATED" | null
  onBidPlaced: () => Promise<void> | void
  onDelayedBidCancelled: () => Promise<void> | void
}

export function AuctionBidPanel({
  auctionId,
  minimumNextBidCents,
  currentPriceCents,
  isAuthenticated,
  hasPendingDelayedBid,
  currentUserDelayedBidCents,
  currentUserDelayedBidStatus,
  onBidPlaced,
  onDelayedBidCancelled,
}: Props) {
  const router = useRouter()

  const [bidDollars, setBidDollars] = useState(() =>
    Math.ceil(minimumNextBidCents / 100).toString(),
  )
  const [mode, setMode] = useState<BidMode>("IMMEDIATE")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCancellingDelayedBid, setIsCancellingDelayedBid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)

  const parsedBidCents = useMemo(() => {
    const parsed = Number.parseInt(bidDollars, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return null
    return parsed * 100
  }, [bidDollars])

  const showCancelableDelayedBid =
    hasPendingDelayedBid === true &&
    currentUserDelayedBidStatus === "SCHEDULED"

  function beginSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!isAuthenticated) {
      setError("You must be signed in to place a max bid.")
      return
    }

    if (parsedBidCents == null) {
      setError("Enter a valid whole-dollar max bid amount.")
      return
    }

    if (parsedBidCents < minimumNextBidCents) {
      setError("Your max bid is too low. Enter at least the minimum next bid.")
      return
    }

    setError(null)
    setSuccess(null)
    setSessionExpired(false)
    setIsConfirmOpen(true)
  }

  async function confirmSubmit() {
    if (parsedBidCents == null) {
      setIsConfirmOpen(false)
      setError("Enter a valid whole-dollar max bid amount.")
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    setSessionExpired(false)

    try {
      const result = await placeBid(auctionId, {
        maxBidCents: parsedBidCents,
        mode,
      })

      if (result.kind === "auth-expired") {
        setSessionExpired(true)
        setError(result.message)
        return
      }

      if (result.kind !== "ok") {
        setError(result.message)
        return
      }

      await onBidPlaced()

      setSuccess(
        mode === "DELAYED"
          ? "Your delayed max bid was submitted successfully."
          : "Your max bid was submitted successfully. The visible current bid may stay lower unless other bidders compete.",
      )
    } catch {
      setError("We couldn’t place your max bid right now.")
    } finally {
      setIsSubmitting(false)
      setIsConfirmOpen(false)
    }
  }

  async function handleCancelDelayedBid() {
    setIsCancellingDelayedBid(true)
    setError(null)
    setSuccess(null)
    setSessionExpired(false)

    try {
      const result = await cancelDelayedBid(auctionId)

      if (result.kind === "auth-expired") {
        setSessionExpired(true)
        setError(result.message)
        return
      }

      if (result.kind !== "ok") {
        setError(result.message)
        return
      }

      await onDelayedBidCancelled()
      setSuccess("Your delayed bid was cancelled successfully.")
    } catch {
      setError("We couldn’t cancel your delayed bid right now.")
    } finally {
      setIsCancellingDelayedBid(false)
    }
  }

  function goToLogin() {
    const returnTo = encodeURIComponent(`/auctions/${auctionId}`)
    router.push(`/login?returnTo=${returnTo}`)
  }

  const confirmationTitle =
    mode === "DELAYED" ? "Confirm delayed max bid" : "Confirm immediate max bid"

  const confirmationBody =
    mode === "DELAYED"
      ? "Your delayed bid will be saved now. You may keep one delayed bid per auction, submit immediate bids while it remains scheduled, replace it with a new delayed bid, or cancel it before it activates."
      : "We’ll bid only as much as needed, up to your maximum."

  if (!isAuthenticated) {
    return (
      <section
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm"
        data-testid="auction-detail-bidding-guest"
      >
        <h2 className="text-lg font-semibold text-amber-950">Member bidding</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          Sign in to place a max bid on this auction.
        </p>
      </section>
    )
  }

  return (
    <>
      <section
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        data-testid="auction-detail-bidding-panel"
      >
        <h2 className="text-lg font-semibold text-stone-900">Place a max bid</h2>
        <p className="mt-2 text-sm text-stone-600">
          Current bid: {formatMoney(currentPriceCents) ?? "—"}
        </p>
        <p
          className="mt-1 text-sm text-stone-600"
          data-testid="auction-detail-minimum-next-bid-hint"
        >
          Minimum next bid: {formatMoney(minimumNextBidCents) ?? "—"}
        </p>

        {showCancelableDelayedBid ? (
          <div
            className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900"
            data-testid="auction-detail-bid-existing-delayed"
          >
            <p className="font-medium text-sky-950">
              You currently have a delayed bid scheduled.
            </p>
            <p className="mt-1">
              Delayed bid amount: {formatMoney(currentUserDelayedBidCents) ?? "—"}
            </p>
            <p className="mt-2">
              You may keep one delayed bid per auction. You can still place immediate bids while
              this delayed bid remains scheduled.
            </p>
            <p className="mt-1">
              Submitting a new delayed bid replaces your previous delayed bid, and you may cancel it
              before it activates.
            </p>
            <button
              type="button"
              onClick={handleCancelDelayedBid}
              disabled={isCancellingDelayedBid}
              className="mt-3 inline-flex rounded-full border border-sky-300 bg-white px-4 py-2 text-sm font-medium text-sky-900 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="auction-detail-cancel-delayed-bid"
            >
              {isCancellingDelayedBid ? "Cancelling delayed bid..." : "Cancel delayed bid"}
            </button>
          </div>
        ) : null}

        <form className="mt-4 space-y-4" onSubmit={beginSubmit}>
          <fieldset className="space-y-2">
            <legend className="block text-sm font-medium text-stone-900">Bid timing</legend>
            <div className="flex flex-wrap gap-3" data-testid="auction-detail-bid-mode-group">
              <label className="inline-flex items-center gap-2 text-sm text-stone-900">
                <input
                  type="radio"
                  name="bid-mode"
                  value="IMMEDIATE"
                  checked={mode === "IMMEDIATE"}
                  onChange={() => setMode("IMMEDIATE")}
                  data-testid="auction-detail-bid-mode-immediate"
                />
                Immediate
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-stone-900">
                <input
                  type="radio"
                  name="bid-mode"
                  value="DELAYED"
                  checked={mode === "DELAYED"}
                  onChange={() => setMode("DELAYED")}
                  data-testid="auction-detail-bid-mode-delayed"
                />
                Delayed
              </label>
            </div>
          </fieldset>

          <div
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-700"
            data-testid="auction-detail-bid-mode-help"
          >
            {mode === "DELAYED" ? (
              <>
                <p className="font-medium text-stone-900">How delayed max bidding works</p>
                <p className="mt-1">
                  Immediate max bids are active now. Delayed max bids are saved now and activate
                  when the auction enters closing.
                </p>
                <p className="mt-1">
                  Delayed bids must be placed at least 3 hours before close.
                </p>
                <p className="mt-1">
                  You may keep one delayed bid per auction. You may also place immediate bids while
                  your delayed bid remains scheduled.
                </p>
                <p className="mt-1">
                  Submitting a new delayed bid replaces your previous delayed bid.
                </p>
                <p className="mt-1">
                  You may cancel a delayed bid before it activates.
                </p>
                <p className="mt-1">
                  If the live auction price reaches or exceeds your delayed bid, it may no longer be
                  needed. You can submit another delayed bid above the current price if the auction
                  is still eligible.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-stone-900">How max bidding works</p>
                <p className="mt-1">
                  Immediate max bids are active right away. We’ll bid only as much as needed, up to
                  your maximum.
                </p>
                <p className="mt-1">
                  The visible current bid may stay lower than your max bid unless another bidder
                  competes.
                </p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="bid-dollars" className="block text-sm font-medium text-stone-900">
              Your max bid (whole dollars)
            </label>
            <input
              id="bid-dollars"
              inputMode="numeric"
              pattern="[0-9]*"
              value={bidDollars}
              onChange={(e) => setBidDollars(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none ring-0 transition focus:border-stone-500"
              data-testid="auction-detail-bid-input"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="auction-detail-bid-submit"
          >
            {isSubmitting ? "Submitting max bid..." : "Submit max bid"}
          </button>

          {success ? (
            <div
              className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
              data-testid="auction-detail-bid-success"
            >
              {success}
            </div>
          ) : null}

          {sessionExpired ? (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900"
              data-testid="auction-detail-bid-auth-expired"
            >
              <p className="font-medium text-amber-950">Your session expired</p>
              <p className="mt-1">
                Please sign in again before changing your bids. We’ll bring you back to this
                auction.
              </p>
              <button
                type="button"
                onClick={goToLogin}
                className="mt-3 inline-flex rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
                data-testid="auction-detail-bid-sign-in-again"
              >
                Sign in again
              </button>
            </div>
          ) : null}

          {!sessionExpired && error ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              data-testid="auction-detail-bid-error"
            >
              {error}
            </div>
          ) : null}
        </form>
      </section>

      {isConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          data-testid="auction-detail-bid-confirm-overlay"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl"
            data-testid="auction-detail-bid-confirm-dialog"
          >
            <h3 className="text-lg font-semibold text-stone-900">{confirmationTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              You are about to submit a max bid of{" "}
              <span className="font-semibold">{formatMoney(parsedBidCents) ?? "—"}</span>.
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">{confirmationBody}</p>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
                data-testid="auction-detail-bid-confirm-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSubmit}
                disabled={isSubmitting}
                className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="auction-detail-bid-confirm-submit"
              >
                {isSubmitting
                  ? "Submitting..."
                  : mode === "DELAYED"
                    ? "Confirm delayed max bid"
                    : "Confirm immediate max bid"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}