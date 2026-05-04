"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AdminOrderPaymentWindowCard } from "@/components/admin/orders/AdminOrderPaymentWindowCard"
import { AdminOrderRefundPanel } from "@/components/admin/orders/AdminOrderRefundPanel"
import { getAdminOrder } from "@/lib/admin/orders/api"
import type { AdminOrderDetail } from "@/lib/admin/orders/types"

type Props = {
  id: string
}

const adminInputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20 disabled:cursor-not-allowed disabled:opacity-60"

const adminSecondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"

function formatMoney(cents: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
  }).format(cents / 100)
}

function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "—"

  switch (value.toUpperCase()) {
    case "READY_TO_FULFILL":
      return "Ready to fulfill"
    case "AWAITING_PAYMENT":
      return "Awaiting payment"
    case "REFUNDED":
      return "Refunded"
    case "DRAFT":
      return "Draft"
    case "PAID":
      return "Paid"
    default:
      return value.replaceAll("_", " ")
  }
}

function formatSourceType(value: string | null | undefined) {
  if (!value) return "—"

  switch (value.toUpperCase()) {
    case "AUCTION":
      return "Auction"
    case "STORE":
      return "Store"
    default:
      return value.replaceAll("_", " ")
  }
}

function formatShippingMode(value: string | null | undefined) {
  if (!value) return "—"

  switch (value.toUpperCase()) {
    case "UNSELECTED":
      return "Not selected"
    case "SHIP_NOW":
      return "Ship now"
    case "OPEN_BOX":
      return "Open Box"
    default:
      return value.replaceAll("_", " ")
  }
}

function refundState(detail: AdminOrderDetail) {
  if (detail.isFullyRefunded) return "Refunded"
  if (detail.isPartiallyRefunded) return "Partially refunded"
  return "Not refunded"
}

function refundStateClass(detail: AdminOrderDetail) {
  if (detail.isFullyRefunded) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  }

  if (detail.isPartiallyRefunded) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  }

  return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
}

function statusClass(status: string) {
  switch (status.toUpperCase()) {
    case "READY_TO_FULFILL":
    case "PAID":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "AWAITING_PAYMENT":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "REFUNDED":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    default:
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
  }
}

function DetailItem({
  label,
  value,
  testId,
}: {
  label: string
  value?: string | null
  testId?: string
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
        {label}
      </dt>
      <dd data-testid={testId} className="mt-1 break-all text-sm mk-muted-text">
        {value?.trim() || "—"}
      </dd>
    </div>
  )
}

function PaymentInfoCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm font-semibold text-[color:var(--mk-ink)]">
        {value}
      </dd>
    </div>
  )
}

export function AdminOrderDetailPage({ id }: Props) {
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentDueAtOverride, setPaymentDueAtOverride] = useState<string | null>(null)

  const [editingAddress, setEditingAddress] = useState(false)
  const [addressForm, setAddressForm] = useState({
    fullName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    stateOrProvince: "",
    postalCode: "",
    countryCode: "",
  })
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAdminOrder(id)
      setDetail(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load order.")
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const effectivePaymentDueAt = paymentDueAtOverride ?? detail?.paymentDueAt ?? null

  function openAddressEdit() {
    setAddressForm({
      fullName: detail?.shippingAddress?.fullName ?? "",
      addressLine1: detail?.shippingAddress?.addressLine1 ?? "",
      addressLine2: detail?.shippingAddress?.addressLine2 ?? "",
      city: detail?.shippingAddress?.city ?? "",
      stateOrProvince: detail?.shippingAddress?.stateOrProvince ?? "",
      postalCode: detail?.shippingAddress?.postalCode ?? "",
      countryCode: detail?.shippingAddress?.countryCode ?? "",
    })
    setAddressError(null)
    setEditingAddress(true)
  }

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault()
    setIsSavingAddress(true)
    setAddressError(null)

    try {
      const res = await fetch(`/api/bff/admin/orders/${id}/shipping-address`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: addressForm.fullName,
          addressLine1: addressForm.addressLine1,
          addressLine2: addressForm.addressLine2 || null,
          city: addressForm.city,
          stateOrProvince: addressForm.stateOrProvince,
          postalCode: addressForm.postalCode,
          countryCode: addressForm.countryCode,
        }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        setAddressError(body.error ?? body.message ?? "Failed to save address.")
        return
      }

      setEditingAddress(false)
      await load()
    } catch {
      setAddressError("Network error. Please try again.")
    } finally {
      setIsSavingAddress(false)
    }
  }

  const paymentSummary = useMemo(() => {
    if (!detail) return null

    const paidLabel = detail.paidAt ? `Paid ${formatDate(detail.paidAt)}` : "Not paid"
    const dueLabel = effectivePaymentDueAt
      ? `Due ${formatDate(effectivePaymentDueAt)}`
      : "No payment due date"

    return { paidLabel, dueLabel }
  }, [detail, effectivePaymentDueAt])

  if (isLoading) {
    return (
      <div
        data-testid="admin-order-detail-page"
        className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
      >
        Loading order…
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
        Order not found.
      </div>
    )
  }

  return (
    <div data-testid="admin-order-detail-page" className="space-y-6">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1
                data-testid="admin-order-detail-order-number"
                className="text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]"
              >
                {detail.orderNumber}
              </h1>

              <span
                data-testid="admin-order-detail-status"
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                  detail.status,
                )}`}
              >
                {formatStatus(detail.status)}
              </span>

              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${refundStateClass(
                  detail,
                )}`}
              >
                {refundState(detail)}
              </span>
            </div>

            <p className="max-w-3xl text-sm leading-6 mk-muted-text">
              Review backend-confirmed payment state, refund eligibility, refund history, customer
              shipping details, and operational order context. Refunds are handled from this page so
              Orders / Refunds stays discoverable for staff.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Order summary</h2>
            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Core order information, buyer context, source type, and shipping destination.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <DetailItem
                label="Customer email"
                value={detail.customerEmail}
                testId="admin-order-detail-customer-email"
              />
              <DetailItem label="Source type" value={formatSourceType(detail.sourceType)} />
              <DetailItem label="Order id" value={detail.id} />
              <DetailItem label="Auction id" value={detail.auctionId} />
              <DetailItem label="Shipping mode" value={formatShippingMode(detail.shippingMode)} />
              <DetailItem label="Created" value={formatDate(detail.createdAt)} />
              <DetailItem label="Updated" value={formatDate(detail.updatedAt)} />

              {editingAddress ? (
                <div className="md:col-span-2">
                  <p className="mb-2 text-sm font-semibold text-[color:var(--mk-ink)]">
                    Edit shipping address
                  </p>

                  <form
                    onSubmit={(e) => {
                      void handleSaveAddress(e)
                    }}
                    className="space-y-2 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
                  >
                    {(
                      [
                        "fullName",
                        "addressLine1",
                        "addressLine2",
                        "city",
                        "stateOrProvince",
                        "postalCode",
                        "countryCode",
                      ] as const
                    ).map((field) => (
                      <input
                        key={field}
                        placeholder={
                          field === "addressLine2"
                            ? "Address line 2 (optional)"
                            : field === "countryCode"
                              ? "Country code (e.g. US)"
                              : field.replace(/([A-Z])/g, " $1").trim()
                        }
                        value={addressForm[field]}
                        onChange={(e) =>
                          setAddressForm((prev) => ({
                            ...prev,
                            [field]:
                              field === "countryCode"
                                ? e.target.value.toUpperCase().slice(0, 2)
                                : e.target.value,
                          }))
                        }
                        required={field !== "addressLine2"}
                        maxLength={field === "countryCode" ? 2 : undefined}
                        className={adminInputClass}
                        data-testid={`admin-order-address-${field}`}
                      />
                    ))}

                    {addressError ? (
                      <p className="text-sm text-[color:var(--mk-danger)]">{addressError}</p>
                    ) : null}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isSavingAddress}
                        className="mk-cta inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                        data-testid="admin-order-address-save"
                      >
                        {isSavingAddress ? "Saving…" : "Save address"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingAddress(false)}
                        className={adminSecondaryButtonClass}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : detail.shippingAddress ? (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
                    Ship to
                  </p>

                  <address
                    className="not-italic text-sm leading-6 mk-muted-text"
                    data-testid="admin-order-detail-shipping-address"
                  >
                    <div>{detail.shippingAddress.fullName}</div>
                    <div>{detail.shippingAddress.addressLine1}</div>
                    {detail.shippingAddress.addressLine2 ? (
                      <div>{detail.shippingAddress.addressLine2}</div>
                    ) : null}
                    <div>
                      {detail.shippingAddress.city}, {detail.shippingAddress.stateOrProvince}{" "}
                      {detail.shippingAddress.postalCode}
                    </div>
                    <div>{detail.shippingAddress.countryCode}</div>
                  </address>

                  <button
                    type="button"
                    onClick={openAddressEdit}
                    className="mt-2 text-xs font-semibold text-[color:var(--mk-gold)] underline underline-offset-4 hover:text-[color:var(--mk-ink)]"
                    data-testid="admin-order-address-edit"
                  >
                    Edit address
                  </button>
                </div>
              ) : (
                <div>
                  <DetailItem label="Ship to" value={null} />
                  <button
                    type="button"
                    onClick={openAddressEdit}
                    className="mt-1 text-xs font-semibold text-[color:var(--mk-gold)] underline underline-offset-4 hover:text-[color:var(--mk-ink)]"
                    data-testid="admin-order-address-add"
                  >
                    Add address
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Payment context</h2>
            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Totals and provider records are for admin review. Final paid state should always come
              from backend-confirmed payment state, not redirect parameters.
            </p>

            <dl
              data-testid="admin-order-detail-payment-context"
              className="mt-4 grid gap-4 md:grid-cols-2"
            >
              <PaymentInfoCard
                label="Subtotal"
                value={formatMoney(detail.subtotalCents, detail.currencyCode)}
              />
              <PaymentInfoCard
                label="Discounts"
                value={formatMoney(detail.discountTotalCents, detail.currencyCode)}
              />
              <PaymentInfoCard
                label="Shipping"
                value={formatMoney(detail.shippingAmountCents, detail.currencyCode)}
              />
              <PaymentInfoCard
                label="Total"
                value={formatMoney(detail.totalCents, detail.currencyCode)}
              />
              <PaymentInfoCard
                label="Total refunded"
                value={formatMoney(detail.totalRefundedCents, detail.currencyCode)}
              />
              <PaymentInfoCard
                label="Remaining refundable"
                value={formatMoney(detail.remainingRefundableCents, detail.currencyCode)}
              />
              <PaymentInfoCard label="Paid at" value={paymentSummary?.paidLabel ?? "—"} />
              <PaymentInfoCard label="Payment due" value={paymentSummary?.dueLabel ?? "—"} />
            </dl>

            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold text-[color:var(--mk-ink)]">
                Provider payments
              </h3>

              {detail.payments.length === 0 ? (
                <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm mk-muted-text">
                  No provider payments recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {detail.payments.map((payment) => (
                    <div
                      key={`${payment.provider}-${payment.providerPaymentId ?? payment.createdAt}`}
                      className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-[color:var(--mk-ink)]">
                          {payment.provider}
                        </div>
                        <div className="mk-muted-text">{formatStatus(payment.status)}</div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <DetailItem
                          label="Amount"
                          value={formatMoney(payment.amountCents, payment.currencyCode)}
                        />
                        <DetailItem label="Created" value={formatDate(payment.createdAt)} />
                        <DetailItem label="Checkout id" value={payment.providerCheckoutId || "—"} />
                        <DetailItem label="Payment id" value={payment.providerPaymentId || "—"} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5">
            <AdminOrderPaymentWindowCard
              orderId={detail.id}
              paymentDueAt={effectivePaymentDueAt}
              sourceType={detail.sourceType}
              canEdit={true}
              onUpdated={(value) => setPaymentDueAtOverride(value)}
            />
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Refund history</h2>
            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Historical refund attempts and provider refund identifiers for audit review.
            </p>

            <div data-testid="admin-order-detail-refund-history" className="mt-4">
              {detail.refundHistory.length === 0 ? (
                <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm mk-muted-text">
                  No refunds recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {detail.refundHistory.map((refund) => (
                    <div
                      key={refund.refundId}
                      className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-[color:var(--mk-ink)]">
                          {formatMoney(refund.amountCents, refund.currencyCode)}
                        </div>
                        <div className="mk-muted-text">{formatDate(refund.createdAt)}</div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <DetailItem label="Provider" value={refund.provider} />
                        <DetailItem label="Refund id" value={refund.providerRefundId || "—"} />
                        <div className="md:col-span-2">
                          <DetailItem label="Reason" value={refund.reason || "—"} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Refund action</h2>
            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Issue a provider-backed refund when the order is eligible. This action should be used
              carefully and only with a clear reason.
            </p>

            <div data-testid="admin-order-detail-refund-action" className="mt-4">
              {detail.canRefund ? (
                <AdminOrderRefundPanel detail={detail} onRefunded={load} />
              ) : (
                <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm mk-muted-text">
                  Refunds are not available for this order or your role does not allow refunds.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}