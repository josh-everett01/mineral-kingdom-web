"use client"

import { useEffect, useMemo, useState } from "react"
import { getAdminListings } from "@/lib/admin/listings/api"
import { AdminListingListItem } from "@/lib/admin/listings/types"
import {
  createOrUpsertAdminStoreOffer,
  updateAdminStoreOffer,
} from "@/lib/admin/store-offers/api"
import { AdminStoreOfferListItem } from "@/lib/admin/store-offers/types"

type Props = {
  editing: AdminStoreOfferListItem | null
  onSaved?: () => Promise<void> | void
}

type FormState = {
  listingId: string
  price: string
  pricingMode: "FIXED" | "ABSOLUTE_DISCOUNT" | "PERCENTAGE_DISCOUNT"
  discountAmount: string
  discountPercent: string
  isActive: boolean
}

function centsFromDollars(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed * 100)
}

function dollarsFromCents(value: number | null | undefined) {
  if (value == null) return ""
  return (value / 100).toFixed(2)
}

function computePreview(state: FormState) {
  const priceCents = centsFromDollars(state.price)
  if (!priceCents) return null

  if (state.pricingMode === "FIXED") {
    return priceCents
  }

  if (state.pricingMode === "ABSOLUTE_DISCOUNT") {
    const discountCents = centsFromDollars(state.discountAmount)
    if (!discountCents || discountCents >= priceCents) return null
    const result = priceCents - discountCents
    return result > 0 ? result : null
  }

  const percent = Number(state.discountPercent.trim())
  if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) return null
  const bps = Math.round(percent * 100)
  const discount = Math.round((priceCents * bps) / 10_000)
  const result = priceCents - discount
  return result > 0 ? result : null
}

function toInitialState(editing: AdminStoreOfferListItem | null): FormState {
  if (!editing) {
    return {
      listingId: "",
      price: "",
      pricingMode: "FIXED",
      discountAmount: "",
      discountPercent: "",
      isActive: true,
    }
  }

  const pricingMode =
    editing.discountType === "FLAT"
      ? "ABSOLUTE_DISCOUNT"
      : editing.discountType === "PERCENT"
        ? "PERCENTAGE_DISCOUNT"
        : "FIXED"

  return {
    listingId: editing.listingId,
    price: dollarsFromCents(editing.priceCents),
    pricingMode,
    discountAmount: dollarsFromCents(editing.discountCents),
    discountPercent:
      editing.discountPercentBps != null ? (editing.discountPercentBps / 100).toFixed(2) : "",
    isActive: editing.isActive,
  }
}

function money(value: number | null) {
  if (value == null) return "—"
  return `$${(value / 100).toFixed(2)}`
}

export function AdminStoreOfferForm({ editing, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() => toInitialState(editing))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [listingQuery, setListingQuery] = useState("")
  const [publishedListings, setPublishedListings] = useState<AdminListingListItem[]>([])
  const [isLoadingListings, setIsLoadingListings] = useState(true)

  useEffect(() => {
    setForm(toInitialState(editing))
    setError(null)
    setSuccess(null)
  }, [editing])

  useEffect(() => {
    if (editing) {
      setListingQuery(editing.listingTitle ?? "")
      return
    }

    setListingQuery("")
  }, [editing])

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

  const previewCents = useMemo(() => computePreview(form), [form])
  const basePriceCents = useMemo(() => centsFromDollars(form.price), [form.price])

  const savingsLabel = useMemo(() => {
    if (!basePriceCents || !previewCents || previewCents >= basePriceCents) return null

    if (form.pricingMode === "PERCENTAGE_DISCOUNT") {
      const percent = Number(form.discountPercent.trim())
      if (!Number.isFinite(percent) || percent <= 0) return null
      return `${percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(2)}% off`
    }

    if (form.pricingMode === "ABSOLUTE_DISCOUNT") {
      const discountCents = centsFromDollars(form.discountAmount)
      if (!discountCents) return null
      return `Save ${money(discountCents)}`
    }

    return null
  }, [basePriceCents, previewCents, form.pricingMode, form.discountPercent, form.discountAmount])

  const filteredListings = useMemo(() => {
    const query = listingQuery.trim().toLowerCase()
    if (!query) return publishedListings.slice(0, 8)

    return publishedListings.filter((item) =>
      (item.title ?? "").toLowerCase().includes(query),
    ).slice(0, 8)
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

      const priceCents = centsFromDollars(form.price)
      if (!form.listingId.trim()) {
        setError("Select a published listing before saving the offer.")
        return
      }
      if (!priceCents) {
        setError("Base price must be greater than 0.")
        return
      }

      const discountType =
        form.pricingMode === "FIXED"
          ? "NONE"
          : form.pricingMode === "ABSOLUTE_DISCOUNT"
            ? "FLAT"
            : "PERCENT"

      const discountCents =
        form.pricingMode === "ABSOLUTE_DISCOUNT" ? centsFromDollars(form.discountAmount) : null

      const discountPercentBps =
        form.pricingMode === "PERCENTAGE_DISCOUNT"
          ? (() => {
            const percent = Number(form.discountPercent.trim())
            return Number.isFinite(percent) ? Math.round(percent * 100) : null
          })()
          : null

      if (previewCents == null) {
        setError("Enter a valid pricing combination to compute the final price.")
        return
      }

      if (editing) {
        await updateAdminStoreOffer(editing.id, {
          priceCents,
          discountType,
          discountCents,
          discountPercentBps,
          isActive: form.isActive,
          startsAt: null,
          endsAt: null,
        })
        setSuccess("Store offer updated.")
      } else {
        await createOrUpsertAdminStoreOffer({
          listingId: form.listingId.trim(),
          priceCents,
          discountType,
          discountCents,
          discountPercentBps,
          isActive: form.isActive,
          startsAt: null,
          endsAt: null,
        })
        setSuccess("Store offer saved.")
        setForm(toInitialState(null))
        setListingQuery("")
      }

      await onSaved?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save store offer.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section data-testid="admin-store-offer-form" className="rounded-xl border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          {editing ? "Edit store offer" : "Create store offer"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Fixed price maps to no discount. Discounted offers use flat or percentage discounts from
          the base price.
        </p>
      </div>

      {error ? (
        <div
          data-testid="admin-store-offer-form-error"
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          data-testid="admin-store-offer-form-success"
          className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200"
        >
          {success}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Listing</label>

            <input
              data-testid="admin-store-offer-listing-search"
              value={listingQuery}
              onChange={(e) => {
                setListingQuery(e.target.value)
                if (!editing) {
                  setField("listingId", "")
                }
              }}
              disabled={!!editing}
              placeholder={isLoadingListings ? "Loading published listings…" : "Search published listings"}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none disabled:opacity-60"
            />

            <input type="hidden" value={form.listingId} />

            {!editing && filteredListings.length > 0 ? (
              <div
                data-testid="admin-store-offer-listing-results"
                className="mt-2 max-h-52 overflow-auto rounded-md border bg-background"
              >
                {filteredListings.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`admin-store-offer-listing-option-${item.id}`}
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

          <div>
            <label className="mb-1 block text-sm font-medium">Pricing type</label>
            <select
              data-testid="admin-store-offer-pricing-mode"
              value={form.pricingMode}
              onChange={(e) => setField("pricingMode", e.target.value as FormState["pricingMode"])}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="FIXED">Fixed</option>
              <option value="ABSOLUTE_DISCOUNT">Absolute discount</option>
              <option value="PERCENTAGE_DISCOUNT">Percentage discount</option>
            </select>
          </div>

          <label className="flex items-center gap-2 pt-7 text-sm">
            <input
              data-testid="admin-store-offer-is-active"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setField("isActive", e.target.checked)}
            />
            Active
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {form.pricingMode === "FIXED" ? "Fixed price ($)" : "Base price ($)"}
            </label>
            <input
              data-testid="admin-store-offer-price"
              value={form.price}
              onChange={(e) => setField("price", e.target.value)}
              inputMode="decimal"
              placeholder="99.00"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
            />
          </div>

          {form.pricingMode === "ABSOLUTE_DISCOUNT" ? (
            <div>
              <label className="mb-1 block text-sm font-medium">Discount amount ($)</label>
              <input
                data-testid="admin-store-offer-discount-amount"
                value={form.discountAmount}
                onChange={(e) => setField("discountAmount", e.target.value)}
                inputMode="decimal"
                placeholder="10.00"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
              />
            </div>
          ) : null}

          {form.pricingMode === "PERCENTAGE_DISCOUNT" ? (
            <div>
              <label className="mb-1 block text-sm font-medium">Discount percent (%)</label>
              <input
                data-testid="admin-store-offer-discount-percent"
                value={form.discountPercent}
                onChange={(e) => setField("discountPercent", e.target.value)}
                inputMode="decimal"
                placeholder="10"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
              />
            </div>
          ) : null}

          <div className="md:col-span-2">
            <button
              type="button"
              data-testid="admin-store-offer-save"
              onClick={() => void handleSubmit()}
              disabled={isSaving}
              className="inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving…" : editing ? "Update offer" : "Save offer"}
            </button>
          </div>
        </div>

        <aside
          data-testid="admin-store-offer-preview"
          className="rounded-xl border bg-muted/20 p-4 text-sm"
        >
          <div className="font-semibold">Final price preview</div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Base price</span>
              <span>{money(basePriceCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Pricing mode</span>
              <span>
                {form.pricingMode === "FIXED"
                  ? "Fixed"
                  : form.pricingMode === "ABSOLUTE_DISCOUNT"
                    ? "Absolute discount"
                    : "Percentage discount"}
              </span>
            </div>

            {previewCents != null && basePriceCents != null && previewCents < basePriceCents ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Original price</span>
                  <span className="line-through text-muted-foreground">{money(basePriceCents)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Computed final</span>
                  <span className="font-semibold">{money(previewCents)}</span>
                </div>
                {savingsLabel ? (
                  <div className="text-xs font-medium text-emerald-700">{savingsLabel}</div>
                ) : null}
              </>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Computed final</span>
                <span className="font-semibold">{money(previewCents)}</span>
              </div>
            )}
          </div>

          {previewCents == null ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Final price unavailable until valid pricing is entered.
            </p>
          ) : null}
        </aside>
      </div>
    </section>
  )
}