"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { getAdminOrders } from "@/lib/admin/orders/api"
import type { AdminOrderListItem } from "@/lib/admin/orders/types"

function formatMoney(cents: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
  }).format(cents / 100)
}

function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function refundLabel(item: AdminOrderListItem) {
  if (item.isFullyRefunded) return "Refunded"
  if (item.isPartiallyRefunded) return "Partially refunded"
  return "Not refunded"
}

function refundLabelClass(item: AdminOrderListItem) {
  if (item.isFullyRefunded) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  }

  if (item.isPartiallyRefunded) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  }

  return "border-muted bg-muted text-muted-foreground"
}

function statusClass(status: string) {
  switch (status.toUpperCase()) {
    case "READY_TO_FULFILL":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "AWAITING_PAYMENT":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    default:
      return "border-muted bg-muted text-muted-foreground"
  }
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "AWAITING_PAYMENT", label: "Awaiting payment" },
  { value: "READY_TO_FULFILL", label: "Ready to fulfill" },
  { value: "PAID", label: "Paid" },
  { value: "REFUNDED", label: "Refunded" },
]

export function AdminOrdersPage() {
  const [items, setItems] = useState<AdminOrderListItem[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(next?: { q?: string; status?: string }) {
    try {
      setIsLoading(true)
      setError(null)

      const data = await getAdminOrders({
        q: next?.q ?? search,
        status: next?.status ?? status,
      })

      setItems(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders.")
      setItems([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load({ q: "", status: "" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const summaryText = useMemo(() => {
    if (isLoading) return "Loading orders…"
    return `Showing ${items.length} of ${total} order${total === 1 ? "" : "s"}`
  }, [isLoading, items.length, total])

  async function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await load()
  }

  async function handleStatusChange(value: string) {
    setStatus(value)
    await load({ status: value })
  }

  return (
    <div data-testid="admin-orders-page" className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Search and review order/payment context, refund state, and operational details.
        </p>
      </div>

      {error ? (
        <div
          data-testid="admin-orders-error"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border bg-card p-5">
        <form onSubmit={handleSearchSubmit} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div>
            <label className="mb-1 block text-sm font-medium">Search</label>
            <input
              data-testid="admin-orders-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order number or email"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              data-testid="admin-orders-status-filter"
              value={status}
              onChange={(e) => void handleStatusChange(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Search
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <p className="text-sm text-muted-foreground">{summaryText}</p>

        {isLoading ? (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            Loading orders…
          </div>
        ) : items.length === 0 ? (
          <div
            data-testid="admin-orders-empty"
            className="rounded-xl border bg-card p-6 text-sm text-muted-foreground"
          >
            No orders matched your filters.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Refund state</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      data-testid="admin-orders-row"
                      className="border-b last:border-b-0"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium">{item.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">{item.id}</div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        {item.customerEmail || "—"}
                      </td>

                      <td className="px-4 py-3 align-top">
                        {item.sourceType}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${refundLabelClass(
                              item,
                            )}`}
                          >
                            {refundLabel(item)}
                          </span>
                          {item.totalRefundedCents > 0 ? (
                            <div className="text-xs text-muted-foreground">
                              Refunded {formatMoney(item.totalRefundedCents, item.currencyCode)}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        {formatMoney(item.totalCents, item.currencyCode)}
                      </td>

                      <td className="px-4 py-3 align-top">
                        {formatDate(item.createdAt)}
                      </td>

                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${item.id}`}
                          className="inline-flex min-w-[110px] justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
                        >
                          View details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}