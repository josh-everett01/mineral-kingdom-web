"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

import { createSupportTicket } from "@/lib/support/api"
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  type SupportLinkedContext,
  type SupportTicketCategory,
} from "@/lib/support/types"

type Props = {
  defaultCategory?: string
  linkedContext?: SupportLinkedContext
  contextLabel?: string | null
}

const inputClass =
  "mt-1 block w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] shadow-sm outline-none transition placeholder:text-[color:var(--mk-muted)] focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20"

function contextSummary(
  context: SupportLinkedContext | undefined,
  label: string | null | undefined,
): string | null {
  if (!context || context.type === "none") return null
  if (label?.trim()) return label.trim()

  switch (context.type) {
    case "order":
      return "an order"
    case "shippingInvoice":
      return "a shipping invoice"
    case "auction":
      return "an auction"
    case "listing":
      return "a listing"
    default:
      return null
  }
}

function buildLinkedFields(context: SupportLinkedContext | undefined) {
  if (!context || context.type === "none") return {}

  switch (context.type) {
    case "order":
      return { linkedOrderId: context.id }
    case "shippingInvoice":
      return { linkedShippingInvoiceId: context.id }
    case "auction":
      return { linkedAuctionId: context.id }
    case "listing":
      return { linkedListingId: context.id }
    default:
      return {}
  }
}

export function SupportRequestForm({ defaultCategory, linkedContext, contextLabel }: Props) {
  const resolvedCategory: SupportTicketCategory =
    SUPPORT_TICKET_CATEGORIES.includes(defaultCategory as SupportTicketCategory)
      ? (defaultCategory as SupportTicketCategory)
      : "OTHER"

  const summary = contextSummary(linkedContext, contextLabel)

  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState<string>(resolvedCategory)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<{
    ticketId: string
    ticketNumber: string
    guestAccessToken: string | null
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedSubject = subject.trim()
    const trimmedMessage = message.trim()

    if (!trimmedSubject) {
      setError("Subject is required.")
      return
    }

    if (trimmedSubject.length > 200) {
      setError("Subject must be 200 characters or fewer.")
      return
    }

    if (!trimmedMessage) {
      setError("Message is required.")
      return
    }

    if (trimmedMessage.length > 4000) {
      setError("Message must be 4,000 characters or fewer.")
      return
    }

    setSubmitting(true)

    try {
      const response = await createSupportTicket({
        subject: trimmedSubject,
        category,
        message: trimmedMessage,
        ...buildLinkedFields(linkedContext),
      })

      setSubmitted({
        ticketId: response.ticketId,
        ticketNumber: response.ticketNumber,
        guestAccessToken: response.guestAccessToken ?? null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    const isGuest = submitted.guestAccessToken !== null

    return (
      <section
        className="rounded-[2rem] border border-[color:var(--mk-success)]/40 bg-[color:var(--mk-panel-muted)] p-6 text-[color:var(--mk-ink)] shadow-sm"
        data-testid="support-form-success"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[color:var(--mk-success)]/40 bg-[color:var(--mk-panel)] text-[color:var(--mk-success)]">
            <CheckCircle2 className="h-5 w-5" />
          </span>

          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Support request submitted</h2>
            <p className="mt-2 text-sm leading-6 mk-muted-text">
              Your request has been received. Your ticket number is{" "}
              <span className="font-semibold text-[color:var(--mk-ink)]" data-testid="support-form-ticket-number">
                {submitted.ticketNumber}
              </span>
              .
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {isGuest ? (
                <p className="text-sm text-[color:var(--mk-success)]" data-testid="support-form-guest-email-notice">
                  Check your email for a link to view your ticket and reply.
                </p>
              ) : (
                <Link
                  href={`/support/${submitted.ticketId}`}
                  className="mk-cta inline-flex rounded-2xl px-4 py-2 text-sm font-semibold"
                  data-testid="support-form-view-ticket-link"
                >
                  View your ticket
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mk-glass-strong space-y-5 rounded-[2rem] p-5 sm:p-6"
      data-testid="support-request-form"
      noValidate
    >
      {summary ? (
        <div
          className="rounded-2xl border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel-muted)] px-4 py-3 text-sm mk-muted-text"
          data-testid="support-form-context-summary"
        >
          <span className="font-semibold text-[color:var(--mk-ink)]">Regarding:</span> {summary}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="support-subject"
          className="block text-sm font-semibold text-[color:var(--mk-ink)]"
        >
          Subject <span aria-hidden="true">*</span>
        </label>
        <input
          id="support-subject"
          type="text"
          required
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Briefly describe your issue"
          className={inputClass}
          data-testid="support-form-subject"
        />
      </div>

      <div>
        <label
          htmlFor="support-category"
          className="block text-sm font-semibold text-[color:var(--mk-ink)]"
        >
          Category
        </label>
        <select
          id="support-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
          data-testid="support-form-category"
        >
          {SUPPORT_TICKET_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {SUPPORT_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="support-message"
          className="block text-sm font-semibold text-[color:var(--mk-ink)]"
        >
          Message <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="support-message"
          required
          maxLength={4000}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe what you need help with"
          className={inputClass}
          data-testid="support-form-message"
        />
        <p className="mt-1 text-right text-xs mk-muted-text">
          {message.length} / 4,000
        </p>
      </div>

      {error ? (
        <div
          className="rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] px-4 py-3 text-sm text-[color:var(--mk-danger)]"
          role="alert"
          data-testid="support-form-error"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="mk-cta inline-flex rounded-2xl px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="support-form-submit"
        >
          {submitting ? "Submitting…" : "Submit request"}
        </button>

        <Link
          href="/dashboard"
          className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-5 py-2.5 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
          data-testid="support-form-cancel"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}