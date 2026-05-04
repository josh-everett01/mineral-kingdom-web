"use client"

import Link from "next/link"
import { AdminListingListItem } from "@/lib/admin/listings/types"

function formatDate(value: string | null) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleString()
}

function statusClasses(status: string) {
  switch (status.toUpperCase()) {
    case "PUBLISHED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "ARCHIVED":
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] mk-muted-text"
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  }
}

function readinessClasses(ready: boolean) {
  return ready
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
}

function commerceClasses(state: string | null | undefined) {
  switch ((state ?? "").toUpperCase()) {
    case "AVAILABLE":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "STORE_OFFER":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    case "AUCTION":
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
    case "SOLD":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300"
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  }
}

function commerceLabel(state: string | null | undefined) {
  switch ((state ?? "").toUpperCase()) {
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
      return "Unknown"
  }
}

function commerceGuidance(item: AdminListingListItem, ready: boolean) {
  const state = item.commerceState?.toUpperCase()
  if (state) {
    if (item.isEligibleForStoreOffer || item.isEligibleForAuction) {
      return "Eligible for store offer or auction"
    }

    if (state === "STORE_OFFER") return "Fixed-price sale active"
    if (state === "AUCTION") return "Auction-backed listing"
    if (state === "SOLD") return "Locked from reuse"

    return item.storeOfferIneligibilityReason ?? item.auctionIneligibilityReason ?? "Review listing state"
  }

  const status = item.status
  const normalized = status.toUpperCase()

  if (normalized === "DRAFT") {
    return ready ? "Ready to publish" : "Complete required fields"
  }

  if (normalized === "PUBLISHED") {
    return "Catalog-ready; check offer/auction state"
  }

  if (normalized === "ARCHIVED") {
    return "Retired from normal workflows"
  }

  return "Review listing state"
}

export function AdminListingsTable({
  items,
  isLoading,
}: {
  items: AdminListingListItem[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div
        data-testid="admin-listings-loading"
        className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
      >
        Loading listings…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        data-testid="admin-listings-empty"
        className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
      >
        No listings match the current filters. Create a draft listing to get started.
      </div>
    )
  }

  return (
    <section className="mk-glass-strong overflow-hidden rounded-[2rem]">
      <div className="border-b border-[color:var(--mk-border)] p-5">
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Listing records</h2>
        <p className="mt-1 text-sm leading-6 mk-muted-text">
          This table shows catalog readiness. Commerce assignment is handled through store offers
          or auctions.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table data-testid="admin-listings-table" className="min-w-full text-sm">
          <thead className="border-b border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] text-left text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
            <tr>
              <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Catalog status</th>
                  <th className="px-5 py-3">Commerce state</th>
                  <th className="px-5 py-3">Mineral</th>
              <th className="px-5 py-3">Locality</th>
              <th className="px-5 py-3">Inventory</th>
              <th className="px-5 py-3">Updated</th>
              <th className="px-5 py-3">Readiness / next step</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[color:var(--mk-border)]">
            {items.map((item) => {
              const ready = item.publishChecklist?.canPublish ?? false

              return (
                <tr
                  key={item.id}
                  data-testid="admin-listings-row"
                  className="transition hover:bg-[color:var(--mk-panel-muted)]"
                >
                  <td className="px-5 py-4 align-top">
                    <div className="font-semibold text-[color:var(--mk-ink)]">
                      {item.title?.trim() || "Untitled draft"}
                    </div>
                    <div className="mt-1 break-all text-xs mk-muted-text">{item.id}</div>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span
                      data-testid={`admin-listing-status-${item.id}`}
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span
                      data-testid={`admin-listing-commerce-state-${item.id}`}
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${commerceClasses(
                        item.commerceState,
                      )}`}
                    >
                      {commerceLabel(item.commerceState)}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top mk-muted-text">
                    {item.primaryMineralName || "—"}
                  </td>

                  <td className="px-5 py-4 align-top mk-muted-text">
                    {item.localityDisplay || "—"}
                  </td>

                  <td className="px-5 py-4 align-top mk-muted-text">
                    {item.quantityAvailable} / {item.quantityTotal}
                  </td>

                  <td className="px-5 py-4 align-top mk-muted-text">
                    {formatDate(item.updatedAt)}
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${readinessClasses(
                        item.isEligibleForStoreOffer === true ||
                          item.isEligibleForAuction === true ||
                          item.status.toUpperCase() === "PUBLISHED" ||
                          ready,
                      )}`}
                    >
                      {commerceGuidance(item, ready)}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top text-right">
                    <Link
                      data-testid={`admin-listing-edit-link-${item.id}`}
                      href={`/admin/listings/${item.id}`}
                      className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
