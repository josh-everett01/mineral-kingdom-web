"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/auth/useAuth"
import {
  createAdminSupportTicketMessage,
  getAdminSupportTicket,
  updateAdminSupportTicket,
} from "@/lib/admin/support/api"
import { SUPPORT_TICKET_PRIORITIES, type AdminSupportTicketDetail } from "@/lib/admin/support/types"

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

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="font-medium text-foreground">{label}</dt>
      <dd className="mt-1 break-all text-muted-foreground">{value?.trim() || "—"}</dd>
    </div>
  )
}

export function AdminSupportTicketDetailPage({ ticketId }: { ticketId: string }) {
  const { me } = useAuth()
  const [detail, setDetail] = useState<AdminSupportTicketDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replyMessage, setReplyMessage] = useState("")
  const [noteMessage, setNoteMessage] = useState("")
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAdminSupportTicket(ticketId)
      setDetail(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load support ticket.")
    } finally {
      setIsLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    void load()
  }, [load])

  async function runMutation(action: () => Promise<void>, successMessage: string) {
    try {
      setIsMutating(true)
      setError(null)
      setSuccess(null)
      await action()
      await load()
      setSuccess(successMessage)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.")
    } finally {
      setIsMutating(false)
    }
  }

  if (isLoading) {
    return <div data-testid="admin-support-detail-page" className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading ticket…</div>
  }

  if (error && !detail) {
    return <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
  }

  if (!detail) {
    return <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Ticket not found.</div>
  }

  return (
    <div data-testid="admin-support-detail-page" className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 data-testid="admin-support-detail-ticket-number" className="text-2xl font-semibold">{detail.ticketNumber}</h1>
            <span data-testid="admin-support-detail-status" className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(detail.status, "status")}`}>{detail.status}</span>
            <span data-testid="admin-support-detail-priority" className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(detail.priority, "priority")}`}>{detail.priority}</span>
          </div>
          <p className="text-sm text-muted-foreground">{detail.subject}</p>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">{success}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Ticket summary</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <DetailItem label="Requester" value={detail.guestEmail || detail.createdByUserId || "—"} />
              <DetailItem label="Category" value={detail.category} />
              <DetailItem label="Ticket id" value={detail.id} />
              <DetailItem label="Assigned to" value={detail.assignedToUserId || "Unassigned"} />
              <DetailItem label="Order id" value={detail.linkedOrderId} />
              <DetailItem label="Auction id" value={detail.linkedAuctionId} />
              <DetailItem label="Shipping invoice id" value={detail.linkedShippingInvoiceId} />
              <DetailItem label="Listing id" value={detail.linkedListingId} />
              <DetailItem label="Created" value={formatDate(detail.createdAt)} />
              <DetailItem label="Updated" value={formatDate(detail.updatedAt)} />
              <DetailItem label="Closed" value={formatDate(detail.closedAt)} />
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Conversation</h2>
            <div data-testid="admin-support-detail-thread" className="space-y-3">
              {detail.messages.length === 0 ? (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">No messages recorded.</div>
              ) : detail.messages.map((message) => (
                <article key={message.id} className={`rounded-lg border p-4 ${message.isInternalNote ? "border-sky-500/30 bg-sky-500/5" : ""}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">
                      {message.isInternalNote ? "Internal note" : message.authorType === "SUPPORT" ? "Support reply" : "Customer message"}
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(message.createdAt)}</div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{message.bodyText}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Ticket actions</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Priority</label>
                <select
                  value={detail.priority}
                  onChange={(e) => void runMutation(() => updateAdminSupportTicket(ticketId, { priority: e.target.value }), "Priority updated.")}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
                  disabled={isMutating}
                >
                  {SUPPORT_TICKET_PRIORITIES.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  data-testid="admin-support-assign-me"
                  disabled={isMutating || !me.user?.id}
                  onClick={() => void runMutation(() => updateAdminSupportTicket(ticketId, { assignedToUserId: me.user?.id ?? null }), "Ticket assigned to you.")}
                  className="inline-flex justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                >Assign to me</button>
                <button
                  type="button"
                  data-testid="admin-support-unassign"
                  disabled={isMutating}
                  onClick={() => void runMutation(() => updateAdminSupportTicket(ticketId, { assignedToUserId: null }), "Ticket unassigned.")}
                  className="inline-flex justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                >Unassign</button>
                {detail.status === "CLOSED" ? (
                  <button
                    type="button"
                    data-testid="admin-support-reopen"
                    disabled={isMutating}
                    onClick={() => void runMutation(() => updateAdminSupportTicket(ticketId, { status: "OPEN" }), "Ticket reopened.")}
                    className="inline-flex justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >Reopen ticket</button>
                ) : (
                  <button
                    type="button"
                    data-testid="admin-support-close"
                    disabled={isMutating}
                    onClick={() => void runMutation(() => updateAdminSupportTicket(ticketId, { status: "CLOSED" }), "Ticket closed.")}
                    className="inline-flex justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >Close ticket</button>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Reply to customer</h2>
            <textarea
              data-testid="admin-support-reply-message"
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={5}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
              placeholder="Write your reply…"
            />
            <button
              type="button"
              data-testid="admin-support-reply-submit"
              disabled={isMutating || !replyMessage.trim()}
              onClick={() => void runMutation(async () => {
                await createAdminSupportTicketMessage(ticketId, { message: replyMessage.trim(), isInternalNote: false })
                setReplyMessage("")
              }, "Reply sent.")}
              className="mt-3 inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >Send reply</button>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Internal note</h2>
            <textarea
              data-testid="admin-support-note-message"
              value={noteMessage}
              onChange={(e) => setNoteMessage(e.target.value)}
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
              placeholder="Add an internal note…"
            />
            <button
              type="button"
              data-testid="admin-support-note-submit"
              disabled={isMutating || !noteMessage.trim()}
              onClick={() => void runMutation(async () => {
                await createAdminSupportTicketMessage(ticketId, { message: noteMessage.trim(), isInternalNote: true })
                setNoteMessage("")
              }, "Internal note added.")}
              className="mt-3 inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >Add note</button>
          </section>
        </div>
      </div>
    </div>
  )
}