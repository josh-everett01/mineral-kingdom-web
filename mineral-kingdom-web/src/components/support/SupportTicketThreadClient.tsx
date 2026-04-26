"use client"

import * as React from "react"
import { getSupportTicket, replySupportTicket } from "@/lib/support/api"
import type { SupportTicketDto, SupportTicketMessageDto } from "@/lib/support/types"
import { cn } from "@/lib/utils"

type Props = {
  ticketId: string
  token?: string
}

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

function MessageBubble({ message }: { message: SupportTicketMessageDto }) {
  const isSupport = message.authorType === "SUPPORT"

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isSupport ? "items-start" : "items-end",
      )}
      data-testid="support-thread-message"
    >
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <span data-testid="support-thread-message-author">
          {isSupport ? "Support Team" : "You"}
        </span>
        <span>·</span>
        <time dateTime={message.createdAt}>
          {new Date(message.createdAt).toLocaleString()}
        </time>
      </div>
      <div
        className={cn(
          "max-w-prose rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isSupport
            ? "bg-stone-100 text-stone-800"
            : "bg-stone-800 text-white",
        )}
        data-testid="support-thread-message-body"
      >
        {message.bodyText}
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
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {loadError}
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <p className="text-sm text-stone-500">Loading ticket…</p>
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
      {/* Header */}
      <div
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        data-testid="support-thread-header"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Ticket {ticket.ticketNumber}
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-stone-900">
              {ticket.subject}
            </h1>
          </div>
          <span
            className={cn(
              "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
              STATUS_BADGE[ticket.status] ?? "bg-stone-100 text-stone-700",
            )}
            data-testid="support-thread-status"
          >
            {STATUS_LABELS[ticket.status] ?? ticket.status}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-stone-500">
          <span data-testid="support-thread-category">
            Category:{" "}
            <span className="font-medium text-stone-700">{ticket.category}</span>
          </span>
          <span>Priority: <span className="font-medium text-stone-700">{ticket.priority}</span></span>
          <span>
            Opened:{" "}
            <span className="font-medium text-stone-700">
              {new Date(ticket.createdAt).toLocaleDateString()}
            </span>
          </span>
        </div>

        {linkedContext && (
          <div className="mt-3 text-xs text-stone-500" data-testid="support-thread-linked-context">
            Linked {linkedContext.label}:{" "}
            <span className="font-medium text-stone-700">{linkedContext.id}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        data-testid="support-thread-messages"
      >
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-stone-400">
          Conversation
        </h2>

        {visibleMessages.length === 0 ? (
          <p className="text-sm text-stone-500">No messages yet.</p>
        ) : (
          <div className="space-y-4">
            {visibleMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Closed banner */}
      {isClosed && (
        <div
          className="rounded-2xl border border-stone-200 bg-stone-50 p-5 text-sm text-stone-600"
          data-testid="support-thread-closed-banner"
        >
          This ticket has been{" "}
          <span className="font-medium">
            {ticket.status === "Resolved" ? "resolved" : "closed"}
          </span>
          . If you have further questions, please open a new support request.
        </div>
      )}

      {/* Reply form */}
      {!isClosed && (
        <form
          onSubmit={handleReply}
          className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-3"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
            Reply
          </h2>

          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-50"
            placeholder="Write your message…"
            disabled={replyPending}
            required
            data-testid="support-thread-reply-input"
          />

          {replyError && (
            <p className="text-xs text-red-600" data-testid="support-thread-reply-error">
              {replyError}
            </p>
          )}

          <button
            type="submit"
            disabled={replyPending || replyText.trim().length === 0}
            className="rounded-xl bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
            data-testid="support-thread-reply-submit"
          >
            {replyPending ? "Sending…" : "Send Reply"}
          </button>
        </form>
      )}
    </div>
  )
}
