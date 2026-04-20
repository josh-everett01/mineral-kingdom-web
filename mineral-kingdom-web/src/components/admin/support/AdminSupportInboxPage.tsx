"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { getAdminSupportTickets } from "@/lib/admin/support/api"
import {
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
  type AdminSupportTicketListItem,
} from "@/lib/admin/support/types"

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
        return "border-muted bg-muted text-muted-foreground"
    }
  }

  switch (normalized) {
    case "OPEN":
    case "WAITING_ON_SUPPORT":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "WAITING_ON_CUSTOMER":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "CLOSED":
      return "border-muted bg-muted text-muted-foreground"
    case "RESOLVED":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    default:
      return "border-muted bg-muted text-muted-foreground"
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
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Support inbox</h1>
        <p className="text-sm text-muted-foreground">
          Review incoming issues, assign ownership, and reply with full ticket context.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border bg-card p-5">
        <form onSubmit={handleSearchSubmit} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <div>
            <label className="mb-1 block text-sm font-medium">Search</label>
            <input
              data-testid="admin-support-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ticket number, subject, or email"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              data-testid="admin-support-filter-status"
              value={status}
              onChange={(e) => void handleStatusChange(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="">All statuses</option>
              {SUPPORT_TICKET_STATUSES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Priority</label>
            <select
              data-testid="admin-support-filter-priority"
              value={priority}
              onChange={(e) => void handlePriorityChange(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="">All priorities</option>
              {SUPPORT_TICKET_PRIORITIES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button type="submit" className="inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">Search</button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <p className="text-sm text-muted-foreground">{summaryText}</p>

        {isLoading ? (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading tickets…</div>
        ) : items.length === 0 ? (
          <div data-testid="admin-support-empty" className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            No tickets matched your filters.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Ticket</th>
                    <th className="px-4 py-3 font-medium">Requester</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Assigned</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} data-testid="admin-support-row" className="border-b last:border-b-0">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium">{item.ticketNumber}</div>
                        <div className="text-xs text-muted-foreground">{item.subject}</div>
                        <div className="text-xs text-muted-foreground">{item.category}</div>
                      </td>
                      <td className="px-4 py-3 align-top">{item.guestEmail || item.createdByUserId || "—"}</td>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(item.status, "status")}`}>{item.status}</span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(item.priority, "priority")}`}>{item.priority}</span>
                      </td>
                      <td className="px-4 py-3 align-top">{item.assignedToUserId ? "Assigned" : "Unassigned"}</td>
                      <td className="px-4 py-3 align-top">{formatDate(item.updatedAt)}</td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <Link data-testid="admin-support-open-link" href={`/admin/support/${item.id}`} className="inline-flex min-w-[110px] justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
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