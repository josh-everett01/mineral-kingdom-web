"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/auth/useAuth"
import {
  createAdminSupportTicketMessage,
  getAdminSupportTicket,
  updateAdminSupportTicket,
} from "@/lib/admin/support/api"
import {
  SUPPORT_TICKET_PRIORITIES,
  type AdminSupportTicketDetail,
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

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm font-medium text-[color:var(--mk-ink)]">
        {value?.trim() || "—"}
      </dd>
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
    return (
      <div
        data-testid="admin-support-detail-page"
        className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
      >
        Loading ticket…
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
        {error}
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text">
        Ticket not found.
      </div>
    )
  }

  return (
    <div data-testid="admin-support-detail-page" className="space-y-6">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              Support ticket
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1
                data-testid="admin-support-detail-ticket-number"
                className="text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]"
              >
                {detail.ticketNumber}
              </h1>

              <span
                data-testid="admin-support-detail-status"
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(
                  detail.status,
                  "status",
                )}`}
              >
                {detail.status}
              </span>

              <span
                data-testid="admin-support-detail-priority"
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(
                  detail.priority,
                  "priority",
                )}`}
              >
                {detail.priority}
              </span>
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text">
              {detail.subject}
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              Ticket summary
            </h2>

            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Linked entities help admins understand the customer context before replying or taking
              action.
            </p>

            <dl className="mt-4 grid gap-4 md:grid-cols-2">
              <DetailItem
                label="Requester"
                value={detail.guestEmail || detail.createdByUserId || "—"}
              />
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
            </dl>
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              Conversation
            </h2>

            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Customer messages, support replies, and internal notes are shown together for a full
              audit trail.
            </p>

            <div data-testid="admin-support-detail-thread" className="mt-4 space-y-3">
              {detail.messages.length === 0 ? (
                <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm mk-muted-text">
                  No messages recorded.
                </div>
              ) : (
                detail.messages.map((message) => (
                  <article
                    key={message.id}
                    className={`rounded-2xl border p-4 ${message.isInternalNote
                        ? "border-sky-500/30 bg-sky-500/10"
                        : "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)]"
                      }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-[color:var(--mk-ink)]">
                        {message.isInternalNote
                          ? "Internal note"
                          : message.authorType === "SUPPORT"
                            ? "Support reply"
                            : "Customer message"}
                      </div>
                      <div className="text-xs mk-muted-text">
                        {formatDate(message.createdAt)}
                      </div>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[color:var(--mk-ink)]">
                      {message.bodyText}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              Ticket actions
            </h2>

            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Update ownership, priority, or lifecycle state. Changes should reflect the current
              support workflow.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Priority
                </label>
                <select
                  value={detail.priority}
                  onChange={(e) =>
                    void runMutation(
                      () => updateAdminSupportTicket(ticketId, { priority: e.target.value }),
                      "Priority updated.",
                    )
                  }
                  className={adminInputClass}
                  disabled={isMutating}
                >
                  {SUPPORT_TICKET_PRIORITIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  data-testid="admin-support-assign-me"
                  disabled={isMutating || !me.user?.id}
                  onClick={() =>
                    void runMutation(
                      () =>
                        updateAdminSupportTicket(ticketId, {
                          assignedToUserId: me.user?.id ?? null,
                        }),
                      "Ticket assigned to you.",
                    )
                  }
                  className={adminSecondaryButtonClass}
                >
                  Assign to me
                </button>

                <button
                  type="button"
                  data-testid="admin-support-unassign"
                  disabled={isMutating}
                  onClick={() =>
                    void runMutation(
                      () => updateAdminSupportTicket(ticketId, { assignedToUserId: null }),
                      "Ticket unassigned.",
                    )
                  }
                  className={adminSecondaryButtonClass}
                >
                  Unassign
                </button>

                {detail.status === "CLOSED" ? (
                  <button
                    type="button"
                    data-testid="admin-support-reopen"
                    disabled={isMutating}
                    onClick={() =>
                      void runMutation(
                        () => updateAdminSupportTicket(ticketId, { status: "OPEN" }),
                        "Ticket reopened.",
                      )
                    }
                    className={adminSecondaryButtonClass}
                  >
                    Reopen ticket
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="admin-support-close"
                    disabled={isMutating}
                    onClick={() =>
                      void runMutation(
                        () => updateAdminSupportTicket(ticketId, { status: "CLOSED" }),
                        "Ticket closed.",
                      )
                    }
                    className={adminSecondaryButtonClass}
                  >
                    Close ticket
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              Reply to customer
            </h2>

            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Customer replies are visible in the ticket conversation.
            </p>

            <textarea
              data-testid="admin-support-reply-message"
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={5}
              className={`${adminInputClass} mt-4`}
              placeholder="Write your reply…"
            />

            <button
              type="button"
              data-testid="admin-support-reply-submit"
              disabled={isMutating || !replyMessage.trim()}
              onClick={() =>
                void runMutation(async () => {
                  await createAdminSupportTicketMessage(ticketId, {
                    message: replyMessage.trim(),
                    isInternalNote: false,
                  })
                  setReplyMessage("")
                }, "Reply sent.")
              }
              className={`${adminSecondaryButtonClass} mt-3`}
            >
              Send reply
            </button>
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              Internal note
            </h2>

            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Internal notes are for admin context and should not be shown to the customer.
            </p>

            <textarea
              data-testid="admin-support-note-message"
              value={noteMessage}
              onChange={(e) => setNoteMessage(e.target.value)}
              rows={4}
              className={`${adminInputClass} mt-4`}
              placeholder="Add an internal note…"
            />

            <button
              type="button"
              data-testid="admin-support-note-submit"
              disabled={isMutating || !noteMessage.trim()}
              onClick={() =>
                void runMutation(async () => {
                  await createAdminSupportTicketMessage(ticketId, {
                    message: noteMessage.trim(),
                    isInternalNote: true,
                  })
                  setNoteMessage("")
                }, "Internal note added.")
              }
              className={`${adminSecondaryButtonClass} mt-3`}
            >
              Add note
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}