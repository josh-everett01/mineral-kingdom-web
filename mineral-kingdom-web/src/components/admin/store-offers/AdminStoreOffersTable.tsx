"use client"

import { updateAdminStoreOffer } from "@/lib/admin/store-offers/api"
import { AdminStoreOfferListItem } from "@/lib/admin/store-offers/types"

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function statusClasses(isActive: boolean) {
  return isActive
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] mk-muted-text"
}

function pricingModeLabel(discountType: string) {
  switch (discountType.toUpperCase()) {
    case "FLAT":
      return "Flat discount"
    case "PERCENT":
      return "Percent discount"
    default:
      return "Fixed price"
  }
}

export function AdminStoreOffersTable({
  items,
  isLoading,
  onEdit,
  onChanged,
}: {
  items: AdminStoreOfferListItem[]
  isLoading: boolean
  onEdit: (item: AdminStoreOfferListItem) => void
  onChanged?: () => Promise<void> | void
}) {
  async function toggleActive(item: AdminStoreOfferListItem) {
    await updateAdminStoreOffer(item.id, {
      priceCents: item.priceCents,
      discountType: item.discountType,
      discountCents: item.discountCents,
      discountPercentBps: item.discountPercentBps,
      isActive: !item.isActive,
      startsAt: item.startsAt,
      endsAt: item.endsAt,
    })

    await onChanged?.()
  }

  if (isLoading) {
    return (
      <div
        data-testid="admin-store-offers-loading"
        className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
      >
        Loading store offers…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        data-testid="admin-store-offers-empty"
        className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
      >
        No store offers yet. Create one to make a published listing available for fixed-price
        purchase.
      </div>
    )
  }

  return (
    <section className="mk-glass-strong overflow-hidden rounded-[2rem]">
      <div className="border-b border-[color:var(--mk-border)] p-5">
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Fixed-price offers</h2>
        <p className="mt-1 text-sm leading-6 mk-muted-text">
          Active offers are buyer-facing fixed-price sale paths. Inactive offers are preserved for
          admin review but should not appear as available direct-buy items.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table data-testid="admin-store-offers-table" className="min-w-full text-sm">
          <thead className="border-b border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] text-left text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
            <tr>
              <th className="px-5 py-3">Listing</th>
              <th className="px-5 py-3">Pricing type</th>
              <th className="px-5 py-3">Base price</th>
              <th className="px-5 py-3">Buyer price</th>
              <th className="px-5 py-3">Offer status</th>
              <th className="px-5 py-3">Updated</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[color:var(--mk-border)]">
            {items.map((item) => (
              <tr
                key={item.id}
                data-testid="admin-store-offers-row"
                className="transition hover:bg-[color:var(--mk-panel-muted)]"
              >
                <td className="px-5 py-4 align-top">
                  <div className="font-semibold text-[color:var(--mk-ink)]">
                    {item.listingTitle || item.listingId}
                  </div>
                  <div className="mt-1 text-xs mk-muted-text">
                    Listing status: {item.listingStatus || "—"}
                  </div>
                </td>

                <td className="px-5 py-4 align-top mk-muted-text">
                  {pricingModeLabel(item.discountType)}
                </td>

                <td className="px-5 py-4 align-top mk-muted-text">
                  {money(item.priceCents)}
                </td>

                <td className="px-5 py-4 align-top font-semibold text-[color:var(--mk-ink)]">
                  {money(item.effectivePriceCents)}
                </td>

                <td className="px-5 py-4 align-top">
                  <span
                    data-testid={`admin-store-offer-status-${item.id}`}
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                      item.isActive,
                    )}`}
                  >
                    {item.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </td>

                <td className="px-5 py-4 align-top mk-muted-text">
                  {formatDate(item.updatedAt)}
                </td>

                <td className="px-5 py-4 align-top text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      data-testid={`admin-store-offer-edit-${item.id}`}
                      onClick={() => onEdit(item)}
                      className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      data-testid={`admin-store-offer-toggle-${item.id}`}
                      onClick={() => void toggleActive(item)}
                      className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
                    >
                      {item.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}