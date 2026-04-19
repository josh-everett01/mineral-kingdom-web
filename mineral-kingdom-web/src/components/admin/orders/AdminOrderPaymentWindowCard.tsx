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
      className="rounded-lg border p-4 space-y-3"
      data-testid="admin-order-detail-payment-window"
    >
      <div>
        <h3 className="text-base font-semibold">Payment window</h3>
        <p className="text-sm text-muted-foreground">
          Review and extend the auction payment due date when needed.
        </p>
      </div>

      <div className="space-y-1 text-sm">
        <div>
          <span className="font-medium">Source type:</span>{" "}
          <span data-testid="admin-order-detail-payment-window-source">
            {sourceType ?? "—"}
          </span>
        </div>

        <div>
          <span className="font-medium">Current due:</span>{" "}
          <span data-testid="admin-order-detail-payment-window-current">
            {formatDateTime(paymentDueAt)}
          </span>
        </div>

        <div>
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs ${isExpired
                ? "bg-red-100 text-red-800 border border-red-200"
                : "bg-muted text-foreground border border-border"
              }`}
            data-testid="admin-order-detail-payment-window-status"
          >
            {isExpired ? "Payment window expired" : "Payment window active"}
          </span>
        </div>
      </div>

      {!isAuction ? (
        <p className="text-xs text-muted-foreground">
          Payment window extension is only relevant for auction orders.
        </p>
      ) : canEdit ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="payment-due-at">
            New payment due
          </label>

          <input
            id="payment-due-at"
            type="datetime-local"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            data-testid="admin-order-detail-payment-window-input"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
            data-testid="admin-order-detail-payment-window-submit"
          >
            {submitting ? "Updating…" : "Extend payment due"}
          </button>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Your role does not allow payment window updates.
        </p>
      )}
    </div>
  )
}