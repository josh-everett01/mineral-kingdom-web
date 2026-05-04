"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getAdminAuction, startAdminAuction, updateAdminAuction } from "@/lib/admin/auctions/api"
import { AdminAuctionDetail } from "@/lib/admin/auctions/types"

type Props = {
  id: string
}

type FormState = {
  startTime: string
  closeTime: string
  startingPrice: string
  reservePrice: string
  quotedShipping: string
}

function money(cents: number | null | undefined) {
  if (typeof cents !== "number") return "—"
  return `$${(cents / 100).toFixed(2)}`
}

function canEditPreLaunchAuction(status: string | null | undefined) {
  const normalized = status?.toUpperCase()
  return normalized === "DRAFT" || normalized === "SCHEDULED"
}

function centsFromDollars(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

function toDatetimeLocalInput(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

function statusClasses(status: string) {
  switch (status.toUpperCase()) {
    case "LIVE":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "CLOSING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "SCHEDULED":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    case "DRAFT":
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
    default:
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function toForm(detail: AdminAuctionDetail): FormState {
  return {
    startTime: toDatetimeLocalInput(detail.startTime),
    closeTime: toDatetimeLocalInput(detail.closeTime),
    startingPrice: (detail.startingPriceCents / 100).toFixed(2),
    reservePrice: detail.reservePriceCents != null ? (detail.reservePriceCents / 100).toFixed(2) : "",
    quotedShipping:
      detail.quotedShippingCents != null ? (detail.quotedShippingCents / 100).toFixed(2) : "",
  }
}

const adminInputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20 disabled:cursor-not-allowed disabled:opacity-60"

const adminSecondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"

export function AdminAuctionDetailPage({ id }: Props) {
  const [detail, setDetail] = useState<AdminAuctionDetail | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await getAdminAuction(id)
      setDetail(data)
      setForm(toForm(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load auction.")
      setDetail(null)
      setForm(null)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const canEditPreLaunch = canEditPreLaunchAuction(detail?.status)
  const canLaunchNow = canEditPreLaunch

  const reserveSummary = useMemo(() => {
    if (!detail) return "—"
    if (detail.reservePriceCents == null) return "No reserve"
    if (detail.reserveMet == null) return `${money(detail.reservePriceCents)}`
    return `${money(detail.reservePriceCents)} • ${detail.reserveMet ? "Met" : "Not met"}`
  }, [detail])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current))
    setError(null)
    setSuccess(null)
  }

  async function handleSave() {
    if (!form || !detail) return

    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      const startingPriceCents = centsFromDollars(form.startingPrice)
      if (startingPriceCents == null || startingPriceCents <= 0) {
        setError("Starting price must be greater than 0.")
        return
      }

      const reservePriceCents = form.reservePrice.trim() ? centsFromDollars(form.reservePrice) : null
      const quotedShippingCents = form.quotedShipping.trim()
        ? centsFromDollars(form.quotedShipping)
        : null

      if (reservePriceCents != null && reservePriceCents < startingPriceCents) {
        setError("Reserve must be greater than or equal to starting price.")
        return
      }

      await updateAdminAuction(detail.auctionId, {
        startTime: form.startTime.trim() ? new Date(form.startTime).toISOString() : null,
        closeTime: form.closeTime.trim() ? new Date(form.closeTime).toISOString() : null,
        startingPriceCents,
        reservePriceCents,
        quotedShippingCents,
      })

      await load()
      setSuccess("Auction updated.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update auction.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStart() {
    if (!detail) return

    try {
      setIsStarting(true)
      setError(null)
      setSuccess(null)

      await startAdminAuction(detail.auctionId)
      await load()
      setSuccess("Auction launched.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start auction.")
    } finally {
      setIsStarting(false)
    }
  }

  if (isLoading) {
    return (
      <div
        data-testid="admin-auction-detail-page"
        className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
      >
        Loading auction…
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
        {error}
      </div>
    )
  }

  if (!detail || !form) {
    return (
      <div className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text">
        Auction not found.
      </div>
    )
  }

  return (
    <div data-testid="admin-auction-detail-page" className="space-y-6">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
                {detail.listingTitle ?? "Untitled auction"}
              </h1>

              <span
                data-testid="admin-auction-detail-status"
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                  detail.status,
                )}`}
              >
                {detail.status}
              </span>
            </div>

            <p className="max-w-3xl text-sm leading-6 mk-muted-text">
              Monitor auction state, bid activity, reserve progress, shipping quote, and launch timing.
              Auction settings can only be edited before launch while the auction is Draft or Scheduled.
              Once an auction is live, bidding integrity is protected by locking schedule, pricing, reserve,
              and shipping quote changes.
            </p>
          </div>

          {canLaunchNow ? (
            <div data-testid="admin-auction-owner-actions" className="shrink-0">
              <button
                type="button"
                data-testid="admin-auction-start"
                onClick={() => void handleStart()}
                disabled={isStarting}
                className="mk-cta inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStarting ? "Launching…" : "Launch now"}
              </button>

              <p className="mt-2 max-w-xs text-xs mk-muted-text">
                Launching makes the auction active according to the current schedule and bidding
                rules.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {!canEditPreLaunch ? (
        <section
          className="rounded-[2rem] border border-[color:var(--mk-gold)]/40 bg-[color:var(--mk-panel-muted)] p-5 text-sm shadow-sm"
          data-testid="admin-auction-live-edit-lock-notice"
        >
          <p className="font-semibold text-[color:var(--mk-ink)]">
            Live and completed auctions are locked for editing.
          </p>
          <p className="mt-2 leading-6 mk-muted-text">
            To protect bidding fairness and auditability, auction settings can only be changed before
            launch. Please confirm start time, close time, starting price, reserve, and quoted shipping
            before launching a Draft or Scheduled auction.
          </p>
        </section>
      ) : null}

      {error ? (
        <div className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              Operational context
            </h2>

            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Use this snapshot to confirm bidding activity, reserve progress, and shipping setup.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <DetailItem label="Current bid" value={money(detail.currentPriceCents)} testId="admin-auction-detail-current-bid" />
              <DetailItem label="Bid count" value={String(detail.bidCount)} testId="admin-auction-detail-bid-count" />
              <DetailItem label="Reserve" value={reserveSummary} testId="admin-auction-detail-reserve-met" />
              <DetailItem
                label="Closing window end"
                value={formatDateTime(detail.closingWindowEnd)}
                testId="admin-auction-detail-closing-window-end"
              />
              <DetailItem
                label="Start time"
                value={formatDateTime(detail.startTime)}
                testId="admin-auction-detail-start-time"
              />
              <DetailItem label="Close time" value={formatDateTime(detail.closeTime)} testId="admin-auction-detail-close-time" />
              <DetailItem label="Quoted shipping" value={money(detail.quotedShippingCents)} />
            </div>
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              Schedule and pricing
            </h2>

            <p className="mt-1 text-sm leading-6 mk-muted-text">
              These values control what bidders see when the auction opens. They are editable only while the
              auction is Draft or Scheduled. Review carefully before launch because live auctions are locked.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Start time
                </label>
                <input
                  data-testid="admin-auction-start-time"
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setField("startTime", e.target.value)}
                  disabled={!canLaunchNow}
                  className={adminInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Close time
                </label>
                <input
                  data-testid="admin-auction-close-time"
                  type="datetime-local"
                  value={form.closeTime}
                  onChange={(e) => setField("closeTime", e.target.value)}
                  disabled={!canLaunchNow}
                  className={adminInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Starting price ($)
                </label>
                <input
                  data-testid="admin-auction-starting-price"
                  value={form.startingPrice}
                  onChange={(e) => setField("startingPrice", e.target.value)}
                  inputMode="decimal"
                  disabled={!canLaunchNow}
                  className={adminInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Reserve ($)
                </label>
                <input
                  data-testid="admin-auction-reserve-price"
                  value={form.reservePrice}
                  onChange={(e) => setField("reservePrice", e.target.value)}
                  inputMode="decimal"
                  disabled={!canLaunchNow}
                  className={adminInputClass}
                />
                <p className="mt-1 text-xs mk-muted-text">
                  Optional minimum sale amount. Leave blank for no reserve.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Quoted shipping ($)
                </label>
                <input
                  data-testid="admin-auction-quoted-shipping"
                  value={form.quotedShipping}
                  onChange={(e) => setField("quotedShipping", e.target.value)}
                  inputMode="decimal"
                  disabled={!canLaunchNow}
                  className={adminInputClass}
                />
                <p className="mt-1 text-xs mk-muted-text">
                  Optional shipping amount shown for auction checkout when the buyer chooses direct
                  shipment.
                </p>
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!canLaunchNow || isSaving}
                  className={adminSecondaryButtonClass}
                >
                  {isSaving ? "Saving…" : "Save pre-launch changes"}
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <SummaryRow label="Auction id" value={detail.auctionId} />
              <SummaryRow label="Listing id" value={detail.listingId} />
              <SummaryRow label="Status" value={detail.status} />
              <SummaryRow label="Created" value={formatDateTime(detail.createdAt)} />
              <SummaryRow label="Updated" value={formatDateTime(detail.updatedAt)} />
              <SummaryRow label="Relist of" value={detail.relistOfAuctionId ?? "—"} />
              <SummaryRow label="Replacement" value={detail.replacementAuctionId ?? "—"} />
            </div>
          </section>
        </aside>
      </div>
    </div>
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
    <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
        {label}
      </dt>
      <dd data-testid={testId} className="mt-1 break-all text-sm text-[color:var(--mk-ink)]">
        {value?.trim() || "—"}
      </dd>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="mk-muted-text">{label}</span>
      <span className="break-all text-right font-medium text-[color:var(--mk-ink)]">{value}</span>
    </div>
  )
}