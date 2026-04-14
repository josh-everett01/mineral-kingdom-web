"use client"

import { useEffect, useMemo, useState } from "react"
import { getAdminListings } from "@/lib/admin/listings/api"
import { AdminListingListItem } from "@/lib/admin/listings/types"
import { createAdminAuction } from "@/lib/admin/auctions/api"

type Props = {
  onCreated?: (auctionId: string) => Promise<void> | void
}

type LaunchMode = "DRAFT" | "NOW" | "SCHEDULED"
type TimingMode = "PRESET_DURATION" | "MANUAL"

type FormState = {
  listingId: string
  launchMode: LaunchMode
  timingMode: TimingMode
  durationHours: string
  startTime: string
  closeTime: string
  startingPrice: string
  reservePrice: string
  quotedShipping: string
}

function centsFromDollars(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

function toDatetimeLocalInput(value: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(
    value.getHours(),
  )}:${pad(value.getMinutes())}`
}

function initialForm(): FormState {
  const start = new Date()
  start.setHours(start.getHours() + 1)

  const close = new Date(start)
  close.setDate(close.getDate() + 1)

  return {
    listingId: "",
    launchMode: "NOW",
    timingMode: "PRESET_DURATION",
    durationHours: "24",
    startTime: toDatetimeLocalInput(start),
    closeTime: toDatetimeLocalInput(close),
    startingPrice: "",
    reservePrice: "",
    quotedShipping: "",
  }
}

export function AdminAuctionCreateForm({ onCreated }: Props) {
  const [form, setForm] = useState<FormState>(() => initialForm())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [listingQuery, setListingQuery] = useState("")
  const [publishedListings, setPublishedListings] = useState<AdminListingListItem[]>([])
  const [isLoadingListings, setIsLoadingListings] = useState(true)

  useEffect(() => {
    let active = true

    async function loadListings() {
      try {
        setIsLoadingListings(true)
        const data = await getAdminListings()
        if (!active) return
        setPublishedListings(data.filter((item) => item.status?.toUpperCase() === "PUBLISHED"))
      } catch {
        if (!active) return
        setPublishedListings([])
      } finally {
        if (active) {
          setIsLoadingListings(false)
        }
      }
    }

    void loadListings()

    return () => {
      active = false
    }
  }, [])

  const filteredListings = useMemo(() => {
    const query = listingQuery.trim().toLowerCase()
    if (!query) return publishedListings.slice(0, 8)

    return publishedListings
      .filter((item) => (item.title ?? "").toLowerCase().includes(query))
      .slice(0, 8)
  }, [listingQuery, publishedListings])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setError(null)
    setSuccess(null)
  }

  function selectListing(item: AdminListingListItem) {
    setField("listingId", item.id)
    setListingQuery(item.title ?? item.id)
    setError(null)
    setSuccess(null)
  }

  async function handleSubmit() {
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      if (!form.listingId.trim()) {
        setError("Select a published listing.")
        return
      }

      const startingPriceCents = centsFromDollars(form.startingPrice)
      if (startingPriceCents == null || startingPriceCents <= 0) {
        setError("Starting price must be greater than 0.")
        return
      }

      const reservePriceCents = form.reservePrice.trim()
        ? centsFromDollars(form.reservePrice)
        : null
      const quotedShippingCents = form.quotedShipping.trim()
        ? centsFromDollars(form.quotedShipping)
        : null

      if (reservePriceCents != null && reservePriceCents < startingPriceCents) {
        setError("Reserve must be greater than or equal to starting price.")
        return
      }

      let startTime: string | null = null
      let closeTime: string | null = null
      let durationHours: number | null = null

      if (form.launchMode === "SCHEDULED") {
        if (!form.startTime.trim()) {
          setError("Start time is required for scheduled auctions.")
          return
        }

        const startDate = new Date(form.startTime)
        if (Number.isNaN(startDate.getTime())) {
          setError("Start time is invalid.")
          return
        }

        startTime = startDate.toISOString()
      }

      if (form.timingMode === "PRESET_DURATION") {
        const parsedDuration = Number(form.durationHours)
        if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
          setError("Select a valid preset duration.")
          return
        }

        durationHours = parsedDuration
      } else {
        if (!form.closeTime.trim()) {
          setError("Close time is required for manual timing.")
          return
        }

        const closeDate = new Date(form.closeTime)
        if (Number.isNaN(closeDate.getTime())) {
          setError("Close time is invalid.")
          return
        }

        closeTime = closeDate.toISOString()
      }

      const result = await createAdminAuction({
        listingId: form.listingId.trim(),
        startingPriceCents,
        reservePriceCents,
        quotedShippingCents,
        launchMode: form.launchMode,
        timingMode: form.timingMode,
        durationHours,
        startTime,
        closeTime,
      })

      setSuccess(
        form.launchMode === "NOW"
          ? "Auction launched."
          : form.launchMode === "SCHEDULED"
            ? "Auction scheduled."
            : "Auction draft created.",
      )
      setForm(initialForm())
      setListingQuery("")
      await onCreated?.(result.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create auction.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section data-testid="admin-auction-create-form" className="rounded-xl border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Create auction</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose whether to save a draft, launch immediately, or schedule the auction for later.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
          {success}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">Listing</label>
          <input
            data-testid="admin-auction-listing-search"
            value={listingQuery}
            onChange={(e) => {
              setListingQuery(e.target.value)
              setField("listingId", "")
            }}
            placeholder={isLoadingListings ? "Loading published listings…" : "Search published listings"}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
          />

          {filteredListings.length > 0 ? (
            <div
              data-testid="admin-auction-listing-results"
              className="mt-2 max-h-52 overflow-auto rounded-md border bg-background"
            >
              {filteredListings.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`admin-auction-listing-option-${item.id}`}
                  onClick={() => selectListing(item)}
                  className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-accent last:border-b-0"
                >
                  <div className="font-medium">{item.title?.trim() || "Untitled listing"}</div>
                  <div className="text-xs text-muted-foreground">{item.id}</div>
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-2 text-xs text-muted-foreground">
            Selected listing id: {form.listingId || "—"}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">Auction mode</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setField("launchMode", "DRAFT")}
              className={`rounded-md border px-3 py-2 text-sm ${form.launchMode === "DRAFT" ? "bg-accent" : ""}`}
            >
              Save as draft
            </button>
            <button
              type="button"
              onClick={() => setField("launchMode", "NOW")}
              className={`rounded-md border px-3 py-2 text-sm ${form.launchMode === "NOW" ? "bg-accent" : ""}`}
            >
              Launch now
            </button>
            <button
              type="button"
              onClick={() => setField("launchMode", "SCHEDULED")}
              className={`rounded-md border px-3 py-2 text-sm ${form.launchMode === "SCHEDULED" ? "bg-accent" : ""}`}
            >
              Schedule for later
            </button>
          </div>
        </div>

        {form.launchMode === "SCHEDULED" ? (
          <div>
            <label className="mb-1 block text-sm font-medium">Start time</label>
            <input
              data-testid="admin-auction-start-time"
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => setField("startTime", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
            />
          </div>
        ) : null}

        <div className={form.launchMode === "SCHEDULED" ? "" : "md:col-span-2"}>
          <label className="mb-2 block text-sm font-medium">Timing mode</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setField("timingMode", "PRESET_DURATION")}
              className={`rounded-md border px-3 py-2 text-sm ${form.timingMode === "PRESET_DURATION" ? "bg-accent" : ""}`}
            >
              Preset duration
            </button>
            <button
              type="button"
              onClick={() => setField("timingMode", "MANUAL")}
              className={`rounded-md border px-3 py-2 text-sm ${form.timingMode === "MANUAL" ? "bg-accent" : ""}`}
            >
              Manual
            </button>
          </div>
        </div>

        {form.timingMode === "PRESET_DURATION" ? (
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Duration preset</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "24 hours", value: "24" },
                { label: "3 days", value: "72" },
                { label: "5 days", value: "120" },
                { label: "7 days", value: "168" },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setField("durationHours", preset.value)}
                  className={`rounded-md border px-3 py-2 text-sm ${form.durationHours === preset.value ? "bg-accent" : ""}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Close time</label>
            <input
              data-testid="admin-auction-close-time"
              type="datetime-local"
              value={form.closeTime}
              onChange={(e) => setField("closeTime", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Starting price ($)</label>
          <input
            data-testid="admin-auction-starting-price"
            value={form.startingPrice}
            onChange={(e) => setField("startingPrice", e.target.value)}
            inputMode="decimal"
            placeholder="100.00"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Reserve ($)</label>
          <input
            data-testid="admin-auction-reserve-price"
            value={form.reservePrice}
            onChange={(e) => setField("reservePrice", e.target.value)}
            inputMode="decimal"
            placeholder="Optional"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Quoted shipping ($)</label>
          <input
            data-testid="admin-auction-quoted-shipping"
            value={form.quotedShipping}
            onChange={(e) => setField("quotedShipping", e.target.value)}
            inputMode="decimal"
            placeholder="Optional"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="button"
            data-testid="admin-auction-save"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className="inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? "Saving…"
              : form.launchMode === "NOW"
                ? "Launch auction"
                : form.launchMode === "SCHEDULED"
                  ? "Schedule auction"
                  : "Save auction draft"}
          </button>
        </div>
      </div>
    </section>
  )
}