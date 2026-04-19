"use client"

import { useEffect, useMemo, useState } from "react"
import { createAdminShippingInvoice } from "@/lib/admin/fulfillment/api"
import type { AdminFulfillmentGroupDetail } from "@/lib/admin/fulfillment/types"

type Props = {
  detail: AdminFulfillmentGroupDetail
  onCreated: () => Promise<void> | void
}

function formatMoney(cents: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
  }).format(cents / 100)
}

export function AdminFulfillmentPricingPanel({ detail, onCreated }: Props) {
  const currencyCode = detail.currencyCode ?? detail.shippingInvoice?.currencyCode ?? "USD"
  const calculatedShippingCents = detail.calculatedShippingCents ?? 0
  const existingInvoice = detail.shippingInvoice

  const initialAmount = existingInvoice?.amountCents ?? calculatedShippingCents

  const [amountInput, setAmountInput] = useState((initialAmount / 100).toFixed(2))
  const [reason, setReason] = useState(existingInvoice?.overrideReason ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const nextAmount = (initialAmount / 100).toFixed(2)
    setAmountInput(nextAmount)
    setReason(existingInvoice?.overrideReason ?? "")
  }, [initialAmount, existingInvoice?.overrideReason])

  const parsedAmountCents = useMemo(() => {
    const parsed = Number(amountInput)
    if (!Number.isFinite(parsed) || parsed < 0) return null
    return Math.round(parsed * 100)
  }, [amountInput])

  const isOverride = parsedAmountCents != null && parsedAmountCents !== calculatedShippingCents
  const invoiceLocked = existingInvoice?.status?.toUpperCase() === "PAID"

  async function handleCreate() {
    setError(null)
    setSuccess(null)

    if (parsedAmountCents == null) {
      setError("Enter a valid shipping amount.")
      return
    }

    if (isOverride && !reason.trim()) {
      setError("Provide a reason when overriding the calculated shipping amount.")
      return
    }

    try {
      setSubmitting(true)

      await createAdminShippingInvoice(detail.fulfillmentGroupId, {
        amountCents: parsedAmountCents,
        reason: isOverride ? reason.trim() : null,
      })

      setSuccess("Shipping invoice created.")
      await onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create shipping invoice.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="rounded-xl border bg-card p-5 space-y-4"
      data-testid="admin-fulfillment-pricing-panel"
    >
      <div>
        <h2 className="text-lg font-semibold">Shipping pricing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the calculated shipping amount below. You can use it as-is or manually enter a different amount before creating the invoice.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium">Calculated shipping</div>
          <div
            className="mt-2 text-xl font-semibold"
            data-testid="admin-fulfillment-calculated-shipping"
          >
            {formatMoney(calculatedShippingCents, currencyCode)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            System-estimated shipping based on current pricing rules.
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium">Current invoice amount</div>
          <div
            className="mt-2 text-xl font-semibold"
            data-testid="admin-fulfillment-current-shipping"
          >
            {formatMoney(existingInvoice?.amountCents ?? calculatedShippingCents, currencyCode)}
          </div>

          <div className="mt-2">
            {existingInvoice?.isOverride ? (
              <span
                className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900"
                data-testid="admin-fulfillment-override-badge"
              >
                Manual override applied
              </span>
            ) : (
              <span
                className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-medium text-stone-800"
                data-testid="admin-fulfillment-override-badge"
              >
                Using calculated shipping
              </span>
            )}
          </div>

          {existingInvoice?.overrideReason ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Reason: {existingInvoice.overrideReason}
            </p>
          ) : null}
        </div>
      </div>

      {!existingInvoice ? (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="shipping-amount"
                className="block text-sm font-medium"
              >
                Amount customer will pay
              </label>
              <input
                id="shipping-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                data-testid="admin-fulfillment-shipping-amount-input"
              />
              <p className="text-xs text-muted-foreground">
                This is the amount that will appear on the shipping invoice.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="shipping-reason"
                className="block text-sm font-medium"
              >
                Manual override reason
              </label>
              <textarea
                id="shipping-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm"
                data-testid="admin-fulfillment-shipping-reason-input"
                placeholder="Required if the amount differs from the calculated shipping."
              />
            </div>
          </div>

          <div>
            {isOverride ? (
              <span
                className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900"
                data-testid="admin-fulfillment-create-mode"
              >
                Manual override will be applied
              </span>
            ) : (
              <span
                className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-800"
                data-testid="admin-fulfillment-create-mode"
              >
                Using calculated shipping
              </span>
            )}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

          <button
            type="button"
            onClick={handleCreate}
            disabled={submitting || invoiceLocked}
            className="inline-flex rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
            data-testid="admin-fulfillment-create-invoice"
          >
            {submitting ? "Creating invoice…" : "Create shipping invoice"}
          </button>
        </div>
      ) : (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Shipping invoice already exists. The next step is viewing the invoice detail and, if still unpaid, adjusting it there.
        </div>
      )}
    </div>
  )
}