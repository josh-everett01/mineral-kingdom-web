"use client"

import * as React from "react"
import Link from "next/link"
import { LifeBuoy, MessageCircle, PlusCircle } from "lucide-react"

import { ProtectedPage } from "@/components/auth/ProtectedPage"
import { getMySupportTickets } from "@/lib/support/api"
import type { SupportTicketListItem } from "@/lib/support/types"
import { Container } from "@/components/site/Container"

const STATUS_LABELS: Record<string, string> = {
  Open: "Open",
  OPEN: "Open",

  WaitingOnCustomer: "Waiting on You",
  WAITING_ON_CUSTOMER: "Waiting on You",

  WaitingOnSupport: "Waiting on Support",
  WAITING_ON_SUPPORT: "Waiting on Support",

  Resolved: "Resolved",
  RESOLVED: "Resolved",

  Closed: "Closed",
  CLOSED: "Closed",
}

const STATUS_BADGE: Record<string, string> = {
  Open: "border-[color:var(--mk-border-strong)] text-[color:var(--mk-gold)]",
  OPEN: "border-[color:var(--mk-border-strong)] text-[color:var(--mk-gold)]",

  WaitingOnCustomer: "border-[color:var(--mk-gold)]/45 text-[color:var(--mk-gold)]",
  WAITING_ON_CUSTOMER: "border-[color:var(--mk-gold)]/45 text-[color:var(--mk-gold)]",

  WaitingOnSupport: "border-[color:var(--mk-border)] mk-muted-text",
  WAITING_ON_SUPPORT: "border-[color:var(--mk-border)] mk-muted-text",

  Resolved: "border-[color:var(--mk-success)]/45 text-[color:var(--mk-success)]",
  RESOLVED: "border-[color:var(--mk-success)]/45 text-[color:var(--mk-success)]",

  Closed: "border-[color:var(--mk-border)] mk-muted-text",
  CLOSED: "border-[color:var(--mk-border)] mk-muted-text",
}

function formatUpdatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
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
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              Support
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
              Support requests
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 mk-muted-text sm:text-base">
              Track help requests for orders, auctions, shipping invoices, listings, and account questions.
            </p>
          </div>

          <Link
            href="/support/new"
            className="mk-cta inline-flex shrink-0 items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold"
            data-testid="support-new-request"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New request
          </Link>
        </div>
      </section>

      {error ? (
        <section
          className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]"
          data-testid="support-list-error"
        >
          {error}
        </section>
      ) : null}

      {!tickets && !error ? (
        <section className="mk-glass-strong rounded-[2rem] p-6" data-testid="support-list-loading">
          <p className="text-sm mk-muted-text">Loading support requests…</p>
        </section>
      ) : null}

      {tickets && tickets.length === 0 ? (
        <section
          className="mk-glass-strong rounded-[2rem] p-6 text-center"
          data-testid="support-list-empty"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-gold)]">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[color:var(--mk-ink)]">
            No support requests yet
          </h2>
          <p className="mt-2 text-sm mk-muted-text">
            You haven&apos;t submitted any support requests yet.
          </p>
          <Link
            href="/support/new"
            className="mk-cta mt-4 inline-flex rounded-2xl px-5 py-2.5 text-sm font-semibold"
          >
            Submit your first request
          </Link>
        </section>
      ) : null}

      {tickets && tickets.length > 0 ? (
        <section
          className="mk-glass-strong overflow-hidden rounded-[2rem]"
          data-testid="support-list-table"
        >
          <div className="border-b border-[color:var(--mk-border)] p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-gold)]">
                <MessageCircle className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
                  Your tickets
                </h2>
                <p className="text-sm mk-muted-text">
                  {tickets.length} request{tickets.length === 1 ? "" : "s"} found
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] text-left text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
                  <th className="px-5 py-3">Ticket</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--mk-border)]">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="transition hover:bg-[color:var(--mk-panel-muted)]"
                    data-testid="support-list-row"
                  >
                    <td className="px-5 py-4 font-mono text-xs mk-muted-text">
                      {ticket.ticketNumber}
                    </td>
                    <td className="max-w-xs truncate px-5 py-4 font-semibold text-[color:var(--mk-ink)]">
                      {ticket.subject}
                    </td>
                    <td className="px-5 py-4 mk-muted-text">{ticket.category}</td>
                    <td className="px-5 py-4">
                      <span
                        className={[
                          "inline-flex rounded-full border bg-[color:var(--mk-panel)] px-2.5 py-0.5 text-xs font-semibold",
                          STATUS_BADGE[ticket.status] ?? "border-[color:var(--mk-border)] mk-muted-text",
                        ].join(" ")}
                      >
                        {STATUS_LABELS[ticket.status] ?? ticket.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 mk-muted-text">
                      {formatUpdatedAt(ticket.updatedAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/support/${ticket.id}`}
                        className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-xs font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default function SupportListPage() {
  return (
    <div className="mk-preview-page min-h-screen overflow-x-hidden">
      <Container className="py-8 sm:py-10">
        <ProtectedPage>
          <SupportListContent />
        </ProtectedPage>
      </Container>
    </div>
  )
}