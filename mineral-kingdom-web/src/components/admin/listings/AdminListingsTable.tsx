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
      return "border-muted bg-muted text-muted-foreground"
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  }
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
        className="rounded-xl border bg-card p-6 text-sm text-muted-foreground"
      >
        Loading listings…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        data-testid="admin-listings-empty"
        className="rounded-xl border bg-card p-6 text-sm text-muted-foreground"
      >
        No listings yet. Create a draft listing to get started.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table data-testid="admin-listings-table" className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr className="border-b">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Mineral</th>
              <th className="px-4 py-3 font-medium">Locality</th>
              <th className="px-4 py-3 font-medium">Inventory</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium">Publish readiness</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const ready = item.publishChecklist?.canPublish ?? false

              return (
                <tr
                  key={item.id}
                  data-testid="admin-listings-row"
                  className="border-b last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.title?.trim() || "Untitled draft"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      data-testid={`admin-listing-status-${item.id}`}
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.primaryMineralName || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.localityDisplay || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.quantityAvailable} / {item.quantityTotal}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(item.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        ready
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-amber-700 dark:text-amber-300"
                      }
                    >
                      {ready ? "Ready to publish" : "Missing requirements"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      data-testid={`admin-listing-edit-link-${item.id}`}
                      href={`/admin/listings/${item.id}`}
                      className="inline-flex rounded-md border px-3 py-1.5 font-medium hover:bg-accent"
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
    </div>
  )
}