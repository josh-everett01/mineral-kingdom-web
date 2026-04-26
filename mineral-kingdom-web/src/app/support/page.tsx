"use client"

import * as React from "react"
import Link from "next/link"
import { ProtectedPage } from "@/components/auth/ProtectedPage"
import { getMySupportTickets } from "@/lib/support/api"
import type { SupportTicketListItem } from "@/lib/support/types"
import { Container } from "@/components/site/Container"

const STATUS_LABELS: Record<string, string> = {
  Open: "Open",
  WaitingOnCustomer: "Waiting on You",
  WaitingOnSupport: "Waiting on Support",
  Resolved: "Resolved",
  Closed: "Closed",
}

const STATUS_BADGE: Record<string, string> = {
  Open: "bg-blue-100 text-blue-800",
  WaitingOnCustomer: "bg-amber-100 text-amber-800",
  WaitingOnSupport: "bg-stone-100 text-stone-700",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-stone-200 text-stone-600",
}

function SupportListContent() {
  const [tickets, setTickets] = React.useState<SupportTicketListItem[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    getMySupportTickets()
      .then(setTickets)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load tickets."))
  }, [])

  return (
    <div className="space-y-6" data-testid="support-list-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Support Requests
        </h1>
        <Link
          href="/support/new"
          className="rounded-xl bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          New Request
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      )}

      {!tickets && !error && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-500">Loading…</p>
        </div>
      )}

      {tickets && tickets.length === 0 && (
        <div
          className="rounded-2xl border border-stone-200 bg-white p-6 text-center"
          data-testid="support-list-empty"
        >
          <p className="text-sm text-stone-500">
            You haven&apos;t submitted any support requests yet.
          </p>
          <Link
            href="/support/new"
            className="mt-3 inline-block text-sm font-medium text-stone-700 underline hover:text-stone-900"
          >
            Submit your first request
          </Link>
        </div>
      )}

      {tickets && tickets.length > 0 && (
        <div
          className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
          data-testid="support-list-table"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                <th className="px-5 py-3">Ticket</th>
                <th className="px-5 py-3 hidden sm:table-cell">Subject</th>
                <th className="px-5 py-3 hidden md:table-cell">Category</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 hidden lg:table-cell">Updated</th>
                <th className="px-5 py-3 sr-only">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="hover:bg-stone-50 transition-colors"
                  data-testid="support-list-row"
                >
                  <td className="px-5 py-4 font-mono text-xs text-stone-600">
                    {ticket.ticketNumber}
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell max-w-xs truncate text-stone-800">
                    {ticket.subject}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-stone-600">
                    {ticket.category}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[ticket.status] ?? "bg-stone-100 text-stone-700"
                        }`}
                    >
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-stone-500">
                    {new Date(ticket.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/support/${ticket.id}`}
                      className="text-xs font-medium text-stone-700 hover:text-stone-900 underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function SupportListPage() {
  return (
    <Container className="py-10">
      <ProtectedPage>
        <SupportListContent />
      </ProtectedPage>
    </Container>
  )
}
