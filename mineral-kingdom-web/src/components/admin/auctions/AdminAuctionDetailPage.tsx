"use client"

import { useEffect, useMemo, useState } from "react"
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
    case "DRAFT":
      return "border-muted bg-muted text-muted-foreground"
    default:
      return "border-muted bg-muted text-muted-foreground"
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

export function AdminAuctionDetailPage({ id }: Props) {
  const [detail, setDetail] = useState<AdminAuctionDetail | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  async function load() {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAdminAuction(id)
      setDetail(data)
      setForm(toForm(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load auction.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const canLaunchNow =
    detail?.status?.toUpperCase() === "DRAFT" || detail?.status?.toUpperCase() === "SCHEDULED"

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
        className="rounded-xl border bg-card p-6 text-sm text-muted-foreground"
      >
        Loading auction…
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!detail || !form) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Auction not found.
      </div>
    )
  }

  return (
    <div data-testid="admin-auction-detail-page" className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold">{detail.listingTitle ?? "Untitled auction"}</h2>
            <span
              data-testid="admin-auction-detail-status"
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                detail.status,
              )}`}
            >
              {detail.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Monitor auction state, bid activity, reserve status, and timing.
          </p>
        </div>

        {canLaunchNow ? (
          <div data-testid="admin-auction-owner-actions" className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="admin-auction-start"
              onClick={() => void handleStart()}
              disabled={isStarting}
              className="inline-flex rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStarting ? "Launching…" : "Launch auction now"}
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h3 className="mb-4 text-lg font-semibold">Operational context</h3>
            <div className="grid gap-4 md:grid-cols-2">
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

          <section className="rounded-xl border bg-card p-5">
            <h3 className="mb-4 text-lg font-semibold">Schedule and pricing</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Draft and scheduled auctions can be adjusted before launch.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Start time</label>
                <input
                  data-testid="admin-auction-start-time"
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setField("startTime", e.target.value)}
                  disabled={!canLaunchNow}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Close time</label>
                <input
                  data-testid="admin-auction-close-time"
                  type="datetime-local"
                  value={form.closeTime}
                  onChange={(e) => setField("closeTime", e.target.value)}
                  disabled={!canLaunchNow}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Starting price ($)</label>
                <input
                  data-testid="admin-auction-starting-price"
                  value={form.startingPrice}
                  onChange={(e) => setField("startingPrice", e.target.value)}
                  inputMode="decimal"
                  disabled={!canLaunchNow}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Reserve ($)</label>
                <input
                  data-testid="admin-auction-reserve-price"
                  value={form.reservePrice}
                  onChange={(e) => setField("reservePrice", e.target.value)}
                  inputMode="decimal"
                  disabled={!canLaunchNow}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Quoted shipping ($)</label>
                <input
                  data-testid="admin-auction-quoted-shipping"
                  value={form.quotedShipping}
                  onChange={(e) => setField("quotedShipping", e.target.value)}
                  inputMode="decimal"
                  disabled={!canLaunchNow}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!canLaunchNow || isSaving}
                  className="inline-flex rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : "Save pre-launch changes"}
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h3 className="mb-4 text-lg font-semibold">Summary</h3>
            <div className="space-y-3 text-sm">
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
    <div>
      <dt className="font-medium text-foreground">{label}</dt>
      <dd data-testid={testId} className="mt-1 text-muted-foreground">
        {value?.trim() || "—"}
      </dd>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}