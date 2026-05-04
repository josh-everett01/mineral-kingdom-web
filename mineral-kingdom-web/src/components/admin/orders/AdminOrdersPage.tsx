"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { getAdminOrders } from "@/lib/admin/orders/api"
import type { AdminOrderListItem } from "@/lib/admin/orders/types"

const adminInputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20 disabled:cursor-not-allowed disabled:opacity-60"

const adminSecondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"

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

  return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
}

function statusClass(status: string) {
  switch (status.toUpperCase()) {
    case "READY_TO_FULFILL":
    case "PAID":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "AWAITING_PAYMENT":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "REFUNDED":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    default:
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
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
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Admin orders
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
          Orders / Refunds
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text">
          Search and review orders. Refund actions are available to OWNER accounts from each
          order’s detail page.
        </p>
      </section>

      {error ? (
        <div
          data-testid="admin-orders-error"
          className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]"
        >
          {error}
        </div>
      ) : null}

      <section className="mk-glass-strong rounded-[2rem] p-5">
        <form
          onSubmit={handleSearchSubmit}
          className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]"
        >
          <div>
            <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
              Search
            </label>
            <input
              data-testid="admin-orders-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order number or email"
              className={adminInputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
              Status
            </label>
            <select
              data-testid="admin-orders-status-filter"
              value={status}
              onChange={(e) => void handleStatusChange(e.target.value)}
              className={adminInputClass}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button type="submit" className={adminSecondaryButtonClass}>
              Search
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <p className="text-sm mk-muted-text">{summaryText}</p>

        {isLoading ? (
          <div className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text">
            Loading orders…
          </div>
        ) : items.length === 0 ? (
          <div
            data-testid="admin-orders-empty"
            className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
          >
            No orders matched your filters.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-[color:var(--mk-ink)]">
                      Order
                    </th>
                    <th className="px-4 py-3 font-semibold text-[color:var(--mk-ink)]">
                      Customer
                    </th>
                    <th className="px-4 py-3 font-semibold text-[color:var(--mk-ink)]">
                      Source
                    </th>
                    <th className="px-4 py-3 font-semibold text-[color:var(--mk-ink)]">
                      Status
                    </th>
                    <th className="px-4 py-3 font-semibold text-[color:var(--mk-ink)]">
                      Refund state
                    </th>
                    <th className="px-4 py-3 font-semibold text-[color:var(--mk-ink)]">
                      Total
                    </th>
                    <th className="px-4 py-3 font-semibold text-[color:var(--mk-ink)]">
                      Created
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-[color:var(--mk-ink)]">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[color:var(--mk-border)]">
                  {items.map((item) => (
                    <tr key={item.id} data-testid="admin-orders-row">
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-[color:var(--mk-ink)]">
                          {item.orderNumber}
                        </div>
                        <div className="text-xs mk-muted-text">{item.id}</div>
                      </td>

                      <td className="px-4 py-3 align-top mk-muted-text">
                        {item.customerEmail || "—"}
                      </td>

                      <td className="px-4 py-3 align-top mk-muted-text">{item.sourceType}</td>

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
                            <div className="text-xs mk-muted-text">
                              Refunded {formatMoney(item.totalRefundedCents, item.currencyCode)}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top font-semibold text-[color:var(--mk-ink)]">
                        {formatMoney(item.totalCents, item.currencyCode)}
                      </td>

                      <td className="px-4 py-3 align-top mk-muted-text">
                        {formatDate(item.createdAt)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        <Link
                          href={`/admin/orders/${item.id}`}
                          className="inline-flex min-w-[110px] justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
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