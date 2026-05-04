"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { getAdminSupportTickets } from "@/lib/admin/support/api"
import {
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
  type AdminSupportTicketListItem,
} from "@/lib/admin/support/types"

const adminInputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20 disabled:cursor-not-allowed disabled:opacity-60"

const adminSecondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"

function formatDate(value: string | null) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleString()
}

function badgeClass(value: string, kind: "status" | "priority") {
  const normalized = value.toUpperCase()

  if (kind === "priority") {
    switch (normalized) {
      case "URGENT":
        return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
      case "HIGH":
        return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      case "LOW":
        return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
      default:
        return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
    }
  }

  switch (normalized) {
    case "OPEN":
    case "WAITING_ON_SUPPORT":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "WAITING_ON_CUSTOMER":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "CLOSED":
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
    case "RESOLVED":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    default:
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
  }
}

export function AdminSupportInboxPage() {
  const [items, setItems] = useState<AdminSupportTicketListItem[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [priority, setPriority] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(next?: { q?: string; status?: string; priority?: string }) {
    try {
      setIsLoading(true)
      setError(null)

      const data = await getAdminSupportTickets({
        q: next?.q ?? search,
        status: next?.status ?? status,
        priority: next?.priority ?? priority,
      })

      setItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load support tickets.")
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load({ q: "", status: "", priority: "" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const summaryText = useMemo(() => {
    if (isLoading) return "Loading tickets…"
    return `Showing ${items.length} ticket${items.length === 1 ? "" : "s"}`
  }, [isLoading, items.length])

  async function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await load()
  }

  async function handleStatusChange(value: string) {
    setStatus(value)
    await load({ status: value })
  }

  async function handlePriorityChange(value: string) {
    setPriority(value)
    await load({ priority: value })
  }

  return (
    <div data-testid="admin-support-page" className="space-y-6">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Admin support
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
          Support inbox
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text">
          Review incoming customer issues, triage priority, assign ownership, and reply with full
          ticket context. Use filters to quickly find tickets that need action.
        </p>
      </section>

      {error ? (
        <div className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
          {error}
        </div>
      ) : null}

      <section className="mk-glass-strong rounded-[2rem] p-5">
        <form
          onSubmit={handleSearchSubmit}
          className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_220px_auto]"
        >
          <div>
            <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
              Search
            </label>
            <input
              data-testid="admin-support-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ticket number, subject, or email"
              className={adminInputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
              Status
            </label>
            <select
              data-testid="admin-support-filter-status"
              value={status}
              onChange={(e) => void handleStatusChange(e.target.value)}
              className={adminInputClass}
            >
              <option value="">All statuses</option>
              {SUPPORT_TICKET_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
              Priority
            </label>
            <select
              data-testid="admin-support-filter-priority"
              value={priority}
              onChange={(e) => void handlePriorityChange(e.target.value)}
              className={adminInputClass}
            >
              <option value="">All priorities</option>
              {SUPPORT_TICKET_PRIORITIES.map((option) => (
                <option key={option} value={option}>
                  {option}
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
            Loading tickets…
          </div>
        ) : items.length === 0 ? (
          <div
            data-testid="admin-support-empty"
            className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
          >
            No tickets matched your filters.
          </div>
        ) : (
          <div className="mk-glass-strong overflow-hidden rounded-[2rem]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] text-left text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
                  <tr>
                    <th className="px-5 py-3">Ticket</th>
                    <th className="px-5 py-3">Requester</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Priority</th>
                    <th className="px-5 py-3">Assigned</th>
                    <th className="px-5 py-3">Updated</th>
                    <th className="whitespace-nowrap px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[color:var(--mk-border)]">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      data-testid="admin-support-row"
                      className="transition hover:bg-[color:var(--mk-panel-muted)]"
                    >
                      <td className="px-5 py-4 align-top">
                        <div className="font-semibold text-[color:var(--mk-ink)]">
                          {item.ticketNumber}
                        </div>
                        <div className="text-xs mk-muted-text">{item.subject}</div>
                        <div className="text-xs mk-muted-text">{item.category}</div>
                      </td>

                      <td className="px-5 py-4 align-top mk-muted-text">
                        {item.guestEmail || item.createdByUserId || "—"}
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(
                            item.status,
                            "status",
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(
                            item.priority,
                            "priority",
                          )}`}
                        >
                          {item.priority}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top mk-muted-text">
                        {item.assignedToUserId ? "Assigned" : "Unassigned"}
                      </td>

                      <td className="px-5 py-4 align-top mk-muted-text">
                        {formatDate(item.updatedAt)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 align-top">
                        <Link
                          data-testid="admin-support-open-link"
                          href={`/admin/support/${item.id}`}
                          className={adminSecondaryButtonClass}
                        >
                          View ticket
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