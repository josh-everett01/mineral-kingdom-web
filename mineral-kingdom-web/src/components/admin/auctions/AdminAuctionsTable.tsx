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
    case "SCHEDULED":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    case "DRAFT":
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
    default:
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
  }
}

export function AdminAuctionsTable({ items, isLoading = false }: Props) {
  if (isLoading) {
    return (
      <div className="mk-glass-strong rounded-[2rem] p-5 text-sm mk-muted-text">
        Loading auctions…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mk-glass-strong rounded-[2rem] p-5 text-sm mk-muted-text">
        No auctions found.
      </div>
    )
  }

  return (
    <section className="mk-glass-strong overflow-hidden rounded-[2rem]" data-testid="admin-auctions-table">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] text-left text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
            <tr>
              <th className="px-5 py-3">Listing</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Starting</th>
              <th className="px-5 py-3">Current</th>
              <th className="px-5 py-3">Reserve</th>
              <th className="px-5 py-3">Bids</th>
              <th className="px-5 py-3">Close time</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[color:var(--mk-border)]">
            {items.map((item) => (
              <tr
                key={item.id}
                data-testid="admin-auctions-row"
                className="transition hover:bg-[color:var(--mk-panel-muted)]"
              >
                <td className="px-5 py-4 align-top">
                  <div className="font-semibold text-[color:var(--mk-ink)]">
                    {item.listingTitle ?? "Untitled listing"}
                  </div>
                  <div className="text-xs mk-muted-text">{item.listingId}</div>
                </td>

                <td className="px-5 py-4 align-top">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                      item.status,
                    )}`}
                  >
                    {item.status}
                  </span>
                </td>

                <td className="px-5 py-4 align-top mk-muted-text">
                  {money(item.startingPriceCents)}
                </td>

                <td className="px-5 py-4 align-top font-semibold text-[color:var(--mk-ink)]">
                  {money(item.currentPriceCents)}
                </td>

                <td className="px-5 py-4 align-top mk-muted-text">
                  {item.hasReserve ? money(item.reservePriceCents) : "No reserve"}
                </td>

                <td className="px-5 py-4 align-top mk-muted-text">{item.bidCount}</td>

                <td className="px-5 py-4 align-top mk-muted-text">
                  {formatDateTime(item.closingWindowEnd ?? item.closeTime)}
                </td>

                <td className="px-5 py-4 align-top">
                  <Link
                    href={`/admin/auctions/${item.id}`}
                    className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
                  >
                    {item.status?.toUpperCase() === "DRAFT" || item.status?.toUpperCase() === "SCHEDULED"
                      ? "Edit pre-launch"
                      : "View locked"}
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