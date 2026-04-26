"use client"

import { useState } from "react"
import Link from "next/link"
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

function contextSummary(context: SupportLinkedContext | undefined, label: string | null | undefined): string | null {
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
  const [submitted, setSubmitted] = useState<{ ticketId: string; ticketNumber: string; guestAccessToken: string | null } | null>(null)

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
      <div
        className="rounded-2xl border border-green-200 bg-green-50 p-6 text-green-900"
        data-testid="support-form-success"
      >
        <h2 className="text-lg font-semibold">Support request submitted</h2>
        <p className="mt-2 text-sm">
          Your request has been received. Your ticket number is{" "}
          <span className="font-medium" data-testid="support-form-ticket-number">
            {submitted.ticketNumber}
          </span>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {isGuest ? (
            <p className="text-sm text-green-800" data-testid="support-form-guest-email-notice">
              Check your email for a link to view your ticket and reply.
            </p>
          ) : (
            <Link
              href={`/support/${submitted.ticketId}`}
              className="inline-flex rounded-full border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-900 transition hover:bg-green-100"
              data-testid="support-form-view-ticket-link"
            >
              View your ticket
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      data-testid="support-request-form"
      noValidate
    >
      {summary ? (
        <div
          className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700"
          data-testid="support-form-context-summary"
        >
          <span className="font-medium">Regarding:</span> {summary}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="support-subject"
          className="block text-sm font-medium text-stone-900"
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
          className="mt-1 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 shadow-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          data-testid="support-form-subject"
        />
      </div>

      <div>
        <label
          htmlFor="support-category"
          className="block text-sm font-medium text-stone-900"
        >
          Category
        </label>
        <select
          id="support-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
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
          className="block text-sm font-medium text-stone-900"
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
          className="mt-1 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 shadow-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          data-testid="support-form-message"
        />
        <p className="mt-1 text-right text-xs text-stone-400">
          {message.length} / 4,000
        </p>
      </div>

      {error ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
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
          className="inline-flex rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50"
          data-testid="support-form-submit"
        >
          {submitting ? "Submitting…" : "Submit request"}
        </button>
        <Link
          href="/dashboard"
          className="inline-flex rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
          data-testid="support-form-cancel"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
