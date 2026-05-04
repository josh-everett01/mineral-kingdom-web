"use client"

import { useMemo, useState } from "react"
import { extendAdminOrderPaymentDue } from "@/lib/admin/orders/paymentDue"

type Props = {
  orderId: string
  paymentDueAt: string | null
  sourceType?: string | null
  canEdit: boolean
  onUpdated?: (paymentDueAt: string) => void
}

const adminInputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20 disabled:cursor-not-allowed disabled:opacity-60"

const adminSecondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"

function formatDateTime(value: string | null) {
  if (!value) return "—"

  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"

  return d.toLocaleString()
}

function toLocalInputValue(value: string | null) {
  if (!value) return ""

  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""

  const pad = (n: number) => String(n).padStart(2, "0")

  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const min = pad(d.getMinutes())

  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

function localInputToIso(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function AdminOrderPaymentWindowCard({
  orderId,
  paymentDueAt,
  sourceType,
  canEdit,
  onUpdated,
}: Props) {
  const [inputValue, setInputValue] = useState(() => toLocalInputValue(paymentDueAt))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isAuction = (sourceType ?? "").toUpperCase() === "AUCTION"

  const isExpired = useMemo(() => {
    if (!paymentDueAt) return false
    const due = new Date(paymentDueAt)
    return !Number.isNaN(due.getTime()) && due.getTime() < Date.now()
  }, [paymentDueAt])

  async function handleSubmit() {
    setError(null)
    setSuccess(null)

    const iso = localInputToIso(inputValue)
    if (!iso) {
      setError("Enter a valid future date and time.")
      return
    }

    if (new Date(iso).getTime() <= Date.now()) {
      setError("Payment due must be in the future.")
      return
    }

    try {
      setSubmitting(true)
      const result = await extendAdminOrderPaymentDue(orderId, {
        paymentDueAt: iso,
      })

      const updatedValue = result.paymentDueAt ?? iso
      setInputValue(toLocalInputValue(updatedValue))
      setSuccess("Payment window updated.")

      onUpdated?.(updatedValue)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update payment window.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="space-y-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
      data-testid="admin-order-detail-payment-window"
    >
      <div>
        <h3 className="text-base font-semibold text-[color:var(--mk-ink)]">Payment window</h3>
        <p className="mt-1 text-sm leading-6 mk-muted-text">
          Review and extend the auction payment due date when needed.
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-semibold text-[color:var(--mk-ink)]">Source type</span>
          <span className="mk-muted-text" data-testid="admin-order-detail-payment-window-source">
            {sourceType ?? "—"}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-semibold text-[color:var(--mk-ink)]">Current due</span>
          <span className="mk-muted-text" data-testid="admin-order-detail-payment-window-current">
            {formatDateTime(paymentDueAt)}
          </span>
        </div>

        <div>
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${isExpired
                ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              }`}
            data-testid="admin-order-detail-payment-window-status"
          >
            {isExpired ? "Payment window expired" : "Payment window active"}
          </span>
        </div>
      </div>

      {!isAuction ? (
        <p className="text-xs mk-muted-text">
          Payment window extension is only relevant for auction orders.
        </p>
      ) : canEdit ? (
        <div className="space-y-3">
          <label
            className="block text-sm font-semibold text-[color:var(--mk-ink)]"
            htmlFor="payment-due-at"
          >
            New payment due
          </label>

          <input
            id="payment-due-at"
            type="datetime-local"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={adminInputClass}
            data-testid="admin-order-detail-payment-window-input"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className={adminSecondaryButtonClass}
            data-testid="admin-order-detail-payment-window-submit"
          >
            {submitting ? "Updating…" : "Extend payment due"}
          </button>

          {error ? (
            <p className="rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel)] p-3 text-sm text-[color:var(--mk-danger)]">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
              {success}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs mk-muted-text">
          Your role does not allow payment window updates.
        </p>
      )}
    </div>
  )
}