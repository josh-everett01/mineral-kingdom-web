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

const adminInputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20 disabled:cursor-not-allowed disabled:opacity-60"

export function AdminStoreOfferForm({ editing, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() => toInitialState(editing))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [listingQuery, setListingQuery] = useState("")
  const [eligibleListings, setEligibleListings] = useState<AdminListingListItem[]>([])
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

        setEligibleListings(data.filter(isEligibleForStoreOfferSelection))
      } catch {
        if (!active) return
        setEligibleListings([])
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
    if (!query) return eligibleListings.slice(0, 8)

    return eligibleListings
      .filter((item) => (item.title ?? "").toLowerCase().includes(query))
      .slice(0, 8)
  }, [listingQuery, eligibleListings])

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
        setError("Enter a valid pricing combination to compute the buyer-facing final price.")
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
    <section data-testid="admin-store-offer-form" className="mk-glass-strong rounded-[2rem] p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[color:var(--mk-ink)]">
          {editing ? "Edit store offer" : "Create store offer"}
        </h3>
        <p className="mt-1 text-sm leading-6 mk-muted-text">
          Create the direct-buy price shown on the storefront. Use a fixed price for normal
          listings, or add a flat/percentage discount to show sale pricing and savings to buyers.
        </p>
      </div>

      {error ? (
        <div
          data-testid="admin-store-offer-form-error"
          className="mb-4 rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-4 text-sm text-[color:var(--mk-danger)]"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          data-testid="admin-store-offer-form-success"
          className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {success}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
              Listing
            </label>

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
              className={adminInputClass}
            />

            <p className="mt-2 text-xs leading-5 mk-muted-text">
              Only published listings that are not already assigned to an auction, active sale
              offer, or sold order can be selected.
            </p>

            <input type="hidden" value={form.listingId} />

            {!editing && filteredListings.length > 0 ? (
              <div
                data-testid="admin-store-offer-listing-results"
                className="mt-2 max-h-52 overflow-auto rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)]"
              >
                {filteredListings.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`admin-store-offer-listing-option-${item.id}`}
                    onClick={() => selectListing(item)}
                    className="block w-full border-b border-[color:var(--mk-border)] px-3 py-2 text-left text-sm transition hover:bg-[color:var(--mk-panel-muted)] last:border-b-0"
                  >
                    <div className="font-semibold text-[color:var(--mk-ink)]">
                      {item.title?.trim() || "Untitled listing"}
                    </div>
                    <div className="text-xs mk-muted-text">{item.id}</div>
                    {item.commerceState ? (
                      <div className="mt-1 text-xs mk-muted-text">
                        Commerce state: {formatCommerceState(item.commerceState)}
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {!editing && !isLoadingListings && filteredListings.length === 0 ? (
              <div
                data-testid="admin-store-offer-listing-empty"
                className="mt-2 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-3 text-xs leading-5 mk-muted-text"
              >
                No eligible listings found. A listing must be published and not already used by an
                auction, active store offer, or sold order.
              </div>
            ) : null}

            <div className="mt-2 text-xs mk-muted-text">
              Selected listing id: {form.listingId || "—"}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
              Pricing type
            </label>
            <select
              data-testid="admin-store-offer-pricing-mode"
              value={form.pricingMode}
              onChange={(e) => setField("pricingMode", e.target.value as FormState["pricingMode"])}
              className={adminInputClass}
            >
              <option value="FIXED">Fixed</option>
              <option value="ABSOLUTE_DISCOUNT">Absolute discount</option>
              <option value="PERCENTAGE_DISCOUNT">Percentage discount</option>
            </select>
          </div>

          <label className="flex items-center gap-2 pt-7 text-sm font-medium text-[color:var(--mk-ink)]">
            <input
              data-testid="admin-store-offer-is-active"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setField("isActive", e.target.checked)}
              className="h-4 w-4 accent-[color:var(--mk-amethyst)]"
            />
            Active
          </label>

          <div>
            <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
              {form.pricingMode === "FIXED" ? "Fixed price ($)" : "Base price ($)"}
            </label>
            <input
              data-testid="admin-store-offer-price"
              value={form.price}
              onChange={(e) => setField("price", e.target.value)}
              inputMode="decimal"
              placeholder="99.00"
              className={adminInputClass}
            />
          </div>

          {form.pricingMode === "ABSOLUTE_DISCOUNT" ? (
            <div>
              <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                Discount amount ($)
              </label>
              <input
                data-testid="admin-store-offer-discount-amount"
                value={form.discountAmount}
                onChange={(e) => setField("discountAmount", e.target.value)}
                inputMode="decimal"
                placeholder="10.00"
                className={adminInputClass}
              />
            </div>
          ) : null}

          {form.pricingMode === "PERCENTAGE_DISCOUNT" ? (
            <div>
              <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                Discount percent (%)
              </label>
              <input
                data-testid="admin-store-offer-discount-percent"
                value={form.discountPercent}
                onChange={(e) => setField("discountPercent", e.target.value)}
                inputMode="decimal"
                placeholder="10"
                className={adminInputClass}
              />
            </div>
          ) : null}

          <div className="md:col-span-2">
            <button
              type="button"
              data-testid="admin-store-offer-save"
              onClick={() => void handleSubmit()}
              disabled={isSaving}
              className="mk-cta inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving…" : editing ? "Update offer" : "Save offer"}
            </button>
          </div>
        </div>

        <aside
          data-testid="admin-store-offer-preview"
          className="rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm"
        >
          <div className="font-semibold text-[color:var(--mk-ink)]">Buyer price preview</div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="mk-muted-text">Base price</span>
              <span className="font-medium text-[color:var(--mk-ink)]">
                {money(basePriceCents)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="mk-muted-text">Pricing mode</span>
              <span className="text-[color:var(--mk-ink)]">
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
                  <span className="mk-muted-text">Original price</span>
                  <span className="line-through mk-muted-text">{money(basePriceCents)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="mk-muted-text">Computed final</span>
                  <span className="font-semibold text-[color:var(--mk-ink)]">
                    {money(previewCents)}
                  </span>
                </div>
                {savingsLabel ? (
                  <div className="text-xs font-semibold text-[color:var(--mk-success)]">
                    {savingsLabel}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <span className="mk-muted-text">Computed final</span>
                <span className="font-semibold text-[color:var(--mk-ink)]">
                  {money(previewCents)}
                </span>
              </div>
            )}
          </div>

          {previewCents == null ? (
            <p className="mt-3 text-xs mk-muted-text">
              Enter a valid base price and discount to preview what buyers will see.
            </p>
          ) : null}
        </aside>
      </div>
    </section>
  )
}

function isEligibleForStoreOfferSelection(item: AdminListingListItem) {
  if (typeof item.isEligibleForStoreOffer === "boolean") {
    return item.isEligibleForStoreOffer
  }

  return item.status?.toUpperCase() === "PUBLISHED"
}

function formatCommerceState(value: string) {
  switch (value.toUpperCase()) {
    case "AVAILABLE":
      return "Available"
    case "STORE_OFFER":
      return "Store Offer"
    case "AUCTION":
      return "Auction"
    case "SOLD":
      return "Sold"
    case "UNAVAILABLE":
      return "Unavailable"
    default:
      return value
  }
}
