"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { placeBid } from "@/lib/auctions/placeBid"
import { formatMoney } from "@/lib/auctions/getAuctionDetail"

type Props = {
  auctionId: string
  minimumNextBidCents: number
  currentPriceCents: number
  isAuthenticated: boolean
  onBidPlaced: () => Promise<void> | void
}

export function AuctionBidPanel({
  auctionId,
  minimumNextBidCents,
  currentPriceCents,
  isAuthenticated,
  onBidPlaced,
}: Props) {
  const router = useRouter()

  const [bidDollars, setBidDollars] = useState(() =>
    Math.ceil(minimumNextBidCents / 100).toString(),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)

  const parsedBidCents = useMemo(() => {
    const parsed = Number.parseInt(bidDollars, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return null
    return parsed * 100
  }, [bidDollars])

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
        mode: "IMMEDIATE",
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
        "Your max bid was submitted successfully. The visible current bid may stay lower unless other bidders compete.",
      )
    } catch {
      setError("We couldn’t place your max bid right now.")
    } finally {
      setIsSubmitting(false)
      setIsConfirmOpen(false)
    }
  }

  function goToLogin() {
    const returnTo = encodeURIComponent(`/auctions/${auctionId}`)
    router.push(`/login?returnTo=${returnTo}`)
  }

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

        <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-700">
          <p className="font-medium text-stone-900">How max bidding works</p>
          <p className="mt-1">
            All bids are treated as max bids. We’ll bid only as much as needed, up to your maximum.
          </p>
          <p className="mt-1">
            The visible current bid may stay lower than your max bid unless another bidder competes.
          </p>
        </div>

        <form className="mt-4 space-y-4" onSubmit={beginSubmit}>
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
                Please sign in again before placing your max bid. We’ll bring you back to this auction.
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
            <h3 className="text-lg font-semibold text-stone-900">Confirm max bid</h3>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              You are about to submit a max bid of{" "}
              <span className="font-semibold">{formatMoney(parsedBidCents) ?? "—"}</span>.
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              We’ll bid only as much as needed, up to your maximum.
            </p>

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
                {isSubmitting ? "Submitting..." : "Confirm max bid"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}