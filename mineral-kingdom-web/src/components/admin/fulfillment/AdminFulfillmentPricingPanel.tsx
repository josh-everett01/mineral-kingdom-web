"use client"

import { useEffect, useMemo, useState } from "react"
import { createAdminShippingInvoice } from "@/lib/admin/fulfillment/api"
import type { AdminFulfillmentGroupDetail } from "@/lib/admin/fulfillment/types"

type Props = {
  detail: AdminFulfillmentGroupDetail
  onCreated: () => Promise<void> | void
}

const adminInputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20 disabled:cursor-not-allowed disabled:opacity-60"

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
    <section
      className="mk-glass-strong space-y-5 rounded-[2rem] p-5"
      data-testid="admin-fulfillment-pricing-panel"
    >
      <div>
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
          Shipping pricing
        </h2>
        <p className="mt-1 text-sm leading-6 mk-muted-text">
          Review the calculated shipping amount before creating an invoice. If you override the
          amount, add a reason so the adjustment is understandable later.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4">
          <div className="text-sm font-semibold text-[color:var(--mk-ink)]">
            Calculated shipping
          </div>
          <div
            className="mt-2 text-2xl font-semibold text-[color:var(--mk-ink)]"
            data-testid="admin-fulfillment-calculated-shipping"
          >
            {formatMoney(calculatedShippingCents, currencyCode)}
          </div>
          <p className="mt-2 text-xs leading-5 mk-muted-text">
            System-estimated shipping based on the current fulfillment and pricing rules.
          </p>
        </div>

        <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4">
          <div className="text-sm font-semibold text-[color:var(--mk-ink)]">
            Current invoice amount
          </div>
          <div
            className="mt-2 text-2xl font-semibold text-[color:var(--mk-ink)]"
            data-testid="admin-fulfillment-current-shipping"
          >
            {formatMoney(existingInvoice?.amountCents ?? calculatedShippingCents, currencyCode)}
          </div>

          <div className="mt-2">
            {existingInvoice?.isOverride ? (
              <span
                className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                data-testid="admin-fulfillment-override-badge"
              >
                Manual override applied
              </span>
            ) : (
              <span
                className="inline-flex rounded-full border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-2.5 py-1 text-xs font-medium mk-muted-text"
                data-testid="admin-fulfillment-override-badge"
              >
                Using calculated shipping
              </span>
            )}
          </div>

          {existingInvoice?.overrideReason ? (
            <p className="mt-2 text-xs leading-5 mk-muted-text">
              Reason: {existingInvoice.overrideReason}
            </p>
          ) : null}
        </div>
      </div>

      {!existingInvoice ? (
        <div className="space-y-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="shipping-amount"
                className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]"
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
                onChange={(e) => {
                  setAmountInput(e.target.value)
                  setError(null)
                  setSuccess(null)
                }}
                className={adminInputClass}
                data-testid="admin-fulfillment-shipping-amount-input"
              />
              <p className="mt-2 text-xs leading-5 mk-muted-text">
                This is the amount that will appear on the shipping invoice.
              </p>
            </div>

            <div>
              <label
                htmlFor="shipping-reason"
                className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]"
              >
                Manual override reason
              </label>
              <textarea
                id="shipping-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  setError(null)
                  setSuccess(null)
                }}
                rows={3}
                className={adminInputClass}
                data-testid="admin-fulfillment-shipping-reason-input"
                placeholder="Required if the amount differs from calculated shipping."
              />
            </div>
          </div>

          <div>
            {isOverride ? (
              <span
                className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                data-testid="admin-fulfillment-create-mode"
              >
                Manual override will be applied
              </span>
            ) : (
              <span
                className="inline-flex rounded-full border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-2.5 py-1 text-xs font-medium mk-muted-text"
                data-testid="admin-fulfillment-create-mode"
              >
                Using calculated shipping
              </span>
            )}
          </div>

          {error ? (
            <div className="rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-4 text-sm text-[color:var(--mk-danger)]">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
              {success}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={submitting || invoiceLocked}
            className="mk-cta inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="admin-fulfillment-create-invoice"
          >
            {submitting ? "Creating invoice…" : "Create shipping invoice"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm leading-6 mk-muted-text">
          Shipping invoice already exists. View the invoice detail to track payment status or make any
          allowed adjustments before it is paid.
        </div>
      )}
    </section>
  )
}