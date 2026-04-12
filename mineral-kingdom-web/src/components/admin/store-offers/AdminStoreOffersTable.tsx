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
    : "border-muted bg-muted text-muted-foreground"
}

function pricingModeLabel(discountType: string) {
  switch (discountType.toUpperCase()) {
    case "FLAT":
      return "Absolute discount"
    case "PERCENT":
      return "Percentage discount"
    default:
      return "Fixed"
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
        className="rounded-xl border bg-card p-6 text-sm text-muted-foreground"
      >
        Loading store offers…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        data-testid="admin-store-offers-empty"
        className="rounded-xl border bg-card p-6 text-sm text-muted-foreground"
      >
        No store offers yet. Create one to get started.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table data-testid="admin-store-offers-table" className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr className="border-b">
              <th className="px-4 py-3 font-medium">Listing</th>
              <th className="px-4 py-3 font-medium">Pricing type</th>
              <th className="px-4 py-3 font-medium">Base price</th>
              <th className="px-4 py-3 font-medium">Final price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} data-testid="admin-store-offers-row" className="border-b last:border-b-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{item.listingTitle || item.listingId}</div>
                  <div className="text-xs text-muted-foreground">{item.listingStatus}</div>
                </td>
                <td className="px-4 py-3">{pricingModeLabel(item.discountType)}</td>
                <td className="px-4 py-3">{money(item.priceCents)}</td>
                <td className="px-4 py-3 font-medium">{money(item.effectivePriceCents)}</td>
                <td className="px-4 py-3">
                  <span
                    data-testid={`admin-store-offer-status-${item.id}`}
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                      item.isActive,
                    )}`}
                  >
                    {item.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(item.updatedAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      data-testid={`admin-store-offer-edit-${item.id}`}
                      onClick={() => onEdit(item)}
                      className="inline-flex rounded-md border px-3 py-1.5 font-medium hover:bg-accent"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      data-testid={`admin-store-offer-toggle-${item.id}`}
                      onClick={() => void toggleActive(item)}
                      className="inline-flex rounded-md border px-3 py-1.5 font-medium hover:bg-accent"
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
    </div>
  )
}