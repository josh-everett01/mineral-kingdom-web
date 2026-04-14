"use client"

import Link from "next/link"
import { AdminAuctionListItem } from "@/lib/admin/auctions/types"

type Props = {
  items: AdminAuctionListItem[]
  isLoading?: boolean
}

function money(cents: number | null | undefined) {
  if (typeof cents !== "number") return "—"
  return `$${(cents / 100).toFixed(2)}`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
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

export function AdminAuctionsTable({ items, isLoading = false }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Loading auctions…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        No auctions found.
      </div>
    )
  }

  return (
    <section className="rounded-xl border bg-card" data-testid="admin-auctions-table">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Listing</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Starting</th>
              <th className="px-4 py-3 text-left font-medium">Current</th>
              <th className="px-4 py-3 text-left font-medium">Reserve</th>
              <th className="px-4 py-3 text-left font-medium">Bids</th>
              <th className="px-4 py-3 text-left font-medium">Close time</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                data-testid="admin-auctions-row"
                className="border-b last:border-b-0"
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{item.listingTitle ?? "Untitled listing"}</div>
                  <div className="text-xs text-muted-foreground">{item.listingId}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                      item.status,
                    )}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3">{money(item.startingPriceCents)}</td>
                <td className="px-4 py-3">{money(item.currentPriceCents)}</td>
                <td className="px-4 py-3">
                  {item.hasReserve ? money(item.reservePriceCents) : "No reserve"}
                </td>
                <td className="px-4 py-3">{item.bidCount}</td>
                <td className="px-4 py-3">{formatDateTime(item.closingWindowEnd ?? item.closeTime)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/auctions/${item.id}`}
                    className="inline-flex rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    View details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}