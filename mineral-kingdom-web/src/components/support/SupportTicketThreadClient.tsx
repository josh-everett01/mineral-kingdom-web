"use client"

import * as React from "react"
import { Send } from "lucide-react"

import { getSupportTicket, replySupportTicket } from "@/lib/support/api"
import type { SupportTicketDto, SupportTicketMessageDto } from "@/lib/support/types"
import { cn } from "@/lib/utils"

type Props = {
  ticketId: string
  token?: string
}

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

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function MessageBubble({ message }: { message: SupportTicketMessageDto }) {
  const isSupport = message.authorType === "SUPPORT"
  const messageText = message.bodyText?.trim() || "—"

  return (
    <div
      className={cn("flex flex-col gap-1", isSupport ? "items-start" : "items-end")}
      data-testid="support-thread-message"
    >
      <div className="flex items-center gap-2 text-xs mk-muted-text">
        <span data-testid="support-thread-message-author">
          {isSupport ? "Support Team" : "You"}
        </span>
        <span>·</span>
        <time dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>
      </div>

      <div
        className={cn(
          "max-w-prose whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isSupport
            ? "border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-ink)]"
            : "bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600 text-white",
        )}
        data-testid="support-thread-message-body"
      >
        {messageText}
      </div>
    </div>
  )
}

export function SupportTicketThreadClient({ ticketId, token }: Props) {
  const [ticket, setTicket] = React.useState<SupportTicketDto | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [replyText, setReplyText] = React.useState("")
  const [replyError, setReplyError] = React.useState<string | null>(null)
  const [replyPending, setReplyPending] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const loadTicket = React.useCallback(async () => {
    try {
      const data = await getSupportTicket(ticketId, token)
      setTicket(data)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load ticket.")
    }
  }, [ticketId, token])

  React.useEffect(() => {
    void loadTicket()
  }, [loadTicket])

  React.useEffect(() => {
    if (ticket) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [ticket])

  async function handleReply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = replyText.trim()
    if (!trimmed) return

    setReplyPending(true)
    setReplyError(null)

    try {
      await replySupportTicket(ticketId, trimmed, token)
      setReplyText("")
      await loadTicket()
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Failed to send reply.")
    } finally {
      setReplyPending(false)
    }
  }

  if (loadError) {
    return (
      <div className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-6 text-sm text-[color:var(--mk-danger)]">
        {loadError}
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="mk-glass-strong rounded-[2rem] p-6">
        <p className="text-sm mk-muted-text">Loading ticket…</p>
      </div>
    )
  }

  const isClosed = ticket.status === "Resolved" || ticket.status === "Closed"
  const visibleMessages = ticket.messages.filter((m) => !m.isInternalNote)

  const linkedContext: { label: string; id: string } | null =
    ticket.linkedOrderId
      ? { label: "Order", id: ticket.linkedOrderId }
      : ticket.linkedAuctionId
        ? { label: "Auction", id: ticket.linkedAuctionId }
        : ticket.linkedShippingInvoiceId
          ? { label: "Shipping Invoice", id: ticket.linkedShippingInvoiceId }
          : ticket.linkedListingId
            ? { label: "Listing", id: ticket.linkedListingId }
            : null

  return (
    <div className="space-y-6" data-testid="support-thread-page">
      <section
        className="mk-glass-strong rounded-[2rem] p-5 sm:p-6"
        data-testid="support-thread-header"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              Ticket {ticket.ticketNumber}
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-3xl">
              {ticket.subject}
            </h1>
          </div>

          <span
            className={cn(
              "inline-flex rounded-full border bg-[color:var(--mk-panel)] px-3 py-1 text-xs font-semibold",
              STATUS_BADGE[ticket.status] ?? "border-[color:var(--mk-border)] mk-muted-text",
            )}
            data-testid="support-thread-status"
          >
            {STATUS_LABELS[ticket.status] ?? ticket.status}
          </span>
        </div>

        <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-3">
          <ThreadDetail label="Category" value={ticket.category} testId="support-thread-category" />
          <ThreadDetail label="Priority" value={ticket.priority} />
          <ThreadDetail label="Opened" value={formatDateTime(ticket.createdAt)} />
        </dl>

        {linkedContext ? (
          <div
            className="mt-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-4 py-3 text-xs mk-muted-text"
            data-testid="support-thread-linked-context"
          >
            <span className="font-semibold text-[color:var(--mk-ink)]">
              Linked {linkedContext.label}:
            </span>{" "}
            <span className="break-all">{linkedContext.id}</span>
          </div>
        ) : null}
      </section>

      <section
        className="mk-glass-strong rounded-[2rem] p-5 sm:p-6"
        data-testid="support-thread-messages"
      >
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Conversation
        </h2>

        {visibleMessages.length === 0 ? (
          <p className="text-sm mk-muted-text">No messages yet.</p>
        ) : (
          <div className="space-y-4">
            {visibleMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </section>

      {isClosed ? (
        <div
          className="rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-5 text-sm mk-muted-text"
          data-testid="support-thread-closed-banner"
        >
          This ticket has been{" "}
          <span className="font-semibold text-[color:var(--mk-ink)]">
            {ticket.status === "Resolved" ? "resolved" : "closed"}
          </span>
          . If you have further questions, please open a new support request.
        </div>
      ) : null}

      {!isClosed ? (
        <form
          onSubmit={handleReply}
          className="mk-glass-strong space-y-3 rounded-[2rem] p-5 sm:p-6"
        >
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
            Reply
          </h2>

          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition placeholder:text-[color:var(--mk-muted)] focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20 disabled:opacity-50"
            placeholder="Write your message…"
            disabled={replyPending}
            required
            data-testid="support-thread-reply-input"
          />

          {replyError ? (
            <p className="text-xs text-[color:var(--mk-danger)]" data-testid="support-thread-reply-error">
              {replyError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={replyPending || replyText.trim().length === 0}
            className="mk-cta inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="support-thread-reply-submit"
          >
            <Send className="h-4 w-4" />
            {replyPending ? "Sending…" : "Send reply"}
          </button>
        </form>
      ) : null}
    </div>
  )
}

function ThreadDetail({
  label,
  value,
  testId,
}: {
  label: string
  value: string
  testId?: string
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-3">
      <dt className="font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
        {label}
      </dt>
      <dd className="mt-1 break-all mk-muted-text" data-testid={testId}>
        {value}
      </dd>
    </div>
  )
}