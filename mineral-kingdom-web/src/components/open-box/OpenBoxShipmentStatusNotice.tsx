"use client"

type Props = {
  shipmentRequestStatus?: string | null
  hasInvoice?: boolean
  invoicePaid?: boolean
}

function badgeClass(status: string) {
  switch (status) {
    case "REQUESTED":
      return "border-[color:var(--mk-gold)]/50 bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-gold)]"
    case "UNDER_REVIEW":
      return "border-[color:var(--mk-sky)]/40 bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-sky)]"
    case "INVOICED":
      return "border-[color:var(--mk-amethyst)]/40 bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-amethyst)]"
    case "PAID":
      return "border-[color:var(--mk-success)]/40 bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-success)]"
    default:
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-ink)]"
  }
}

function statusLabel(status?: string | null) {
  switch ((status ?? "").toUpperCase()) {
    case "REQUESTED":
      return "Awaiting admin review"
    case "UNDER_REVIEW":
      return "Under review"
    case "INVOICED":
      return "Shipping invoice ready"
    case "PAID":
      return "Shipping paid"
    default:
      return "Open"
  }
}

export function OpenBoxShipmentStatusNotice({
  shipmentRequestStatus,
  hasInvoice,
  invoicePaid,
}: Props) {
  const normalized = (shipmentRequestStatus ?? "").toUpperCase()

  const title =
    normalized === "INVOICED"
      ? "Shipping invoice ready"
      : normalized === "PAID"
        ? "Shipping paid"
        : "Shipment requested"

  const body =
    normalized === "INVOICED"
      ? "Your shipping invoice has been created and is ready for payment."
      : normalized === "PAID"
        ? "Your shipping payment has been received. Your order is now ready for packing and shipment."
        : "We received your request to ship the items currently in your box. Our team will review the shipment and create a shipping invoice. You will not be charged for shipping until that invoice is created."

  return (
    <div
      className="space-y-3 rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 shadow-sm"
      data-testid="open-box-shipment-status-notice"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-base font-semibold text-[color:var(--mk-ink)]">{title}</h3>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(normalized)}`}
          data-testid="open-box-shipment-status-badge"
        >
          {statusLabel(normalized)}
        </span>
      </div>

      <p className="text-sm leading-6 mk-muted-text">{body}</p>

      {normalized === "REQUESTED" || normalized === "UNDER_REVIEW" ? (
        <div className="space-y-2 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] p-3 text-sm">
          <div className="font-semibold text-[color:var(--mk-ink)]">What happens next</div>
          <ol className="list-decimal space-y-1 pl-5 mk-muted-text">
            <li>We review your shipment request</li>
            <li>We create your shipping invoice</li>
            <li>You pay shipping once the invoice is ready</li>
            <li>We pack and ship your order</li>
          </ol>
        </div>
      ) : null}

      {normalized === "INVOICED" && hasInvoice && !invoicePaid ? (
        <p className="text-sm mk-muted-text">
          You can continue below to review and pay the shipping invoice.
        </p>
      ) : null}
    </div>
  )
}