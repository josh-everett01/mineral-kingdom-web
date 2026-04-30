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

const inputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20"

const secondaryButtonClass =
  "rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] shadow-sm transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"

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
        className="rounded-[2rem] border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel-muted)] p-5 shadow-sm"
        data-testid="auction-detail-bidding-guest"
      >
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Member bidding</h2>
        <p className="mt-2 text-sm leading-6 mk-muted-text">
          Sign in to place a max bid on this auction.
        </p>
      </section>
    )
  }

  return (
    <>
      <section
        className="mk-glass-strong rounded-[2rem] p-5 sm:p-6"
        data-testid="auction-detail-bidding-panel"
      >
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Place a max bid</h2>
        <p className="mt-2 text-sm mk-muted-text">
          Current bid: {formatMoney(currentPriceCents) ?? "—"}
        </p>
        <p className="mt-1 text-sm mk-muted-text" data-testid="auction-detail-minimum-next-bid-hint">
          Minimum next bid: {formatMoney(minimumNextBidCents) ?? "—"}
        </p>

        {showCancelableDelayedBid ? (
          <div
            className="mt-4 rounded-2xl border border-[color:var(--mk-cyan)]/40 bg-[color:var(--mk-panel-muted)] px-4 py-4 text-sm mk-muted-text"
            data-testid="auction-detail-bid-existing-delayed"
          >
            <p className="font-semibold text-[color:var(--mk-ink)]">
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
              className={`${secondaryButtonClass} mt-3`}
              data-testid="auction-detail-cancel-delayed-bid"
            >
              {isCancellingDelayedBid ? "Cancelling delayed bid..." : "Cancel delayed bid"}
            </button>
          </div>
        ) : null}

        <form className="mt-4 space-y-4" onSubmit={beginSubmit}>
          <fieldset className="space-y-2">
            <legend className="block text-sm font-semibold text-[color:var(--mk-ink)]">
              Bid timing
            </legend>
            <div className="flex flex-wrap gap-3" data-testid="auction-detail-bid-mode-group">
              <label className="inline-flex items-center gap-2 text-sm text-[color:var(--mk-ink)]">
                <input
                  type="radio"
                  name="bid-mode"
                  value="IMMEDIATE"
                  checked={mode === "IMMEDIATE"}
                  onChange={() => setMode("IMMEDIATE")}
                  className="accent-[color:var(--mk-amethyst)]"
                  data-testid="auction-detail-bid-mode-immediate"
                />
                Immediate
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-[color:var(--mk-ink)]">
                <input
                  type="radio"
                  name="bid-mode"
                  value="DELAYED"
                  checked={mode === "DELAYED"}
                  onChange={() => setMode("DELAYED")}
                  className="accent-[color:var(--mk-amethyst)]"
                  data-testid="auction-detail-bid-mode-delayed"
                />
                Delayed
              </label>
            </div>
          </fieldset>

          <div
            className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-3 py-3 text-sm mk-muted-text"
            data-testid="auction-detail-bid-mode-help"
          >
            {mode === "DELAYED" ? (
              <>
                <p className="font-semibold text-[color:var(--mk-ink)]">How delayed max bidding works</p>
                <p className="mt-1">
                  Immediate max bids are active now. Delayed max bids are saved now and activate
                  when the auction enters closing.
                </p>
                <p className="mt-1">Delayed bids must be placed at least 3 hours before close.</p>
                <p className="mt-1">
                  You may keep one delayed bid per auction. You may also place immediate bids while
                  your delayed bid remains scheduled.
                </p>
                <p className="mt-1">Submitting a new delayed bid replaces your previous delayed bid.</p>
                <p className="mt-1">You may cancel a delayed bid before it activates.</p>
                <p className="mt-1">
                  If the live auction price reaches or exceeds your delayed bid, it may no longer be
                  needed. You can submit another delayed bid above the current price if the auction
                  is still eligible.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-[color:var(--mk-ink)]">How max bidding works</p>
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
            <label htmlFor="bid-dollars" className="block text-sm font-semibold text-[color:var(--mk-ink)]">
              Your max bid (whole dollars)
            </label>
            <input
              id="bid-dollars"
              inputMode="numeric"
              pattern="[0-9]*"
              value={bidDollars}
              onChange={(e) => setBidDollars(e.target.value)}
              className={inputClass}
              data-testid="auction-detail-bid-input"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mk-cta inline-flex rounded-2xl px-4 py-2 text-sm font-semibold transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="auction-detail-bid-submit"
          >
            {isSubmitting ? "Submitting max bid..." : "Submit max bid"}
          </button>

          {success ? (
            <div
              className="rounded-2xl border border-[color:var(--mk-success)]/40 bg-[color:var(--mk-panel-muted)] px-3 py-2 text-sm text-[color:var(--mk-success)]"
              data-testid="auction-detail-bid-success"
            >
              {success}
            </div>
          ) : null}

          {sessionExpired ? (
            <div
              className="rounded-2xl border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel-muted)] px-3 py-3 text-sm mk-muted-text"
              data-testid="auction-detail-bid-auth-expired"
            >
              <p className="font-semibold text-[color:var(--mk-ink)]">Your session expired</p>
              <p className="mt-1">
                Please sign in again before changing your bids. We’ll bring you back to this
                auction.
              </p>
              <button
                type="button"
                onClick={goToLogin}
                className="mk-cta mt-3 inline-flex rounded-2xl px-4 py-2 text-sm font-semibold"
                data-testid="auction-detail-bid-sign-in-again"
              >
                Sign in again
              </button>
            </div>
          ) : null}

          {!sessionExpired && error ? (
            <div
              className="rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] px-3 py-2 text-sm text-[color:var(--mk-danger)]"
              data-testid="auction-detail-bid-error"
            >
              {error}
            </div>
          ) : null}
        </form>
      </section>

      {isConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          data-testid="auction-detail-bid-confirm-overlay"
        >
          <div
            className="w-full max-w-md rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-strong)] p-6 shadow-[var(--mk-shadow)]"
            data-testid="auction-detail-bid-confirm-dialog"
          >
            <h3 className="text-lg font-semibold text-[color:var(--mk-ink)]">{confirmationTitle}</h3>
            <p className="mt-2 text-sm leading-6 mk-muted-text">
              You are about to submit a max bid of{" "}
              <span className="font-semibold text-[color:var(--mk-ink)]">
                {formatMoney(parsedBidCents) ?? "—"}
              </span>.
            </p>
            <p className="mt-2 text-sm leading-6 mk-muted-text">{confirmationBody}</p>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className={secondaryButtonClass}
                data-testid="auction-detail-bid-confirm-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSubmit}
                disabled={isSubmitting}
                className="mk-cta rounded-2xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
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