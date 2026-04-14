"use client"

import { useMemo, useState } from "react"
import { createAdminRefund } from "@/lib/admin/orders/api"
import type { AdminOrderDetail } from "@/lib/admin/orders/types"

type Props = {
  detail: AdminOrderDetail
  onRefunded: () => Promise<void> | void
}

function formatMoney(cents: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
  }).format(cents / 100)
}

function dollarsToCents(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0) return null

  return Math.round(parsed * 100)
}

function centsToDollars(value: number) {
  return (value / 100).toFixed(2)
}

export function AdminOrderRefundPanel({ detail, onRefunded }: Props) {
  const defaultProvider = detail.availableRefundProviders[0] ?? ""

  const [provider, setProvider] = useState(defaultProvider)
  const [amount, setAmount] = useState(centsToDollars(detail.remainingRefundableCents))
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const amountCents = useMemo(() => dollarsToCents(amount), [amount])

  const canSubmit =
    !isSubmitting &&
    !!provider.trim() &&
    !!reason.trim() &&
    amountCents != null &&
    amountCents > 0 &&
    amountCents <= detail.remainingRefundableCents

  function handleUseFullAmount() {
    setAmount(centsToDollars(detail.remainingRefundableCents))
    setError(null)
    setSuccess(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setError(null)
      setSuccess(null)

      if (!provider.trim()) {
        setError("Select a refund provider.")
        return
      }

      if (!reason.trim()) {
        setError("Reason is required.")
        return
      }

      if (amountCents == null || amountCents <= 0) {
        setError("Refund amount must be greater than 0.")
        return
      }

      if (amountCents > detail.remainingRefundableCents) {
        setError("Refund amount cannot exceed the remaining refundable amount.")
        return
      }

      setIsSubmitting(true)

      await createAdminRefund(detail.id, {
        provider: provider.trim(),
        reason: reason.trim(),
        amountCents,
      })

      setSuccess("Refund submitted.")
      setReason("")
      await onRefunded()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refund failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!detail.canRefund) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Refunds are not available for this order.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
          {success}
        </div>
      ) : null}

      <div className="rounded-lg border bg-muted/20 p-4 text-sm">
        <div className="font-medium">Refundable amount</div>
        <div className="mt-1 text-muted-foreground">
          {formatMoney(detail.remainingRefundableCents, detail.currencyCode)}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Provider</label>
        <select
          data-testid="admin-order-detail-refund-provider"
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value)
            setError(null)
            setSuccess(null)
          }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
        >
          <option value="">Select provider</option>
          {detail.availableRefundProviders.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-3">
          <label className="block text-sm font-medium">Refund amount ($)</label>
          <button
            type="button"
            onClick={handleUseFullAmount}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Use full amount
          </button>
        </div>

        <input
          data-testid="admin-order-detail-refund-amount"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            setError(null)
            setSuccess(null)
          }}
          inputMode="decimal"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
        />

        <p className="mt-2 text-xs text-muted-foreground">
          Remaining refundable:{" "}
          {formatMoney(detail.remainingRefundableCents, detail.currencyCode)}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Reason</label>
        <textarea
          data-testid="admin-order-detail-refund-reason"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            setError(null)
            setSuccess(null)
          }}
          rows={4}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
          placeholder="Reason for refund"
        />
      </div>

      <button
        type="submit"
        data-testid="admin-order-detail-refund-submit"
        disabled={!canSubmit}
        className="inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Submitting refund…" : "Submit refund"}
      </button>
    </form>
  )
}