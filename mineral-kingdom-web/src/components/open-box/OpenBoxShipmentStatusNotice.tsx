"use client"

type Props = {
  shipmentRequestStatus?: string | null
  hasInvoice?: boolean
  invoicePaid?: boolean
}

function badgeClass(status: string) {
  switch (status) {
    case "REQUESTED":
      return "bg-amber-100 text-amber-900 border border-amber-200"
    case "UNDER_REVIEW":
      return "bg-blue-100 text-blue-900 border border-blue-200"
    case "INVOICED":
      return "bg-purple-100 text-purple-900 border border-purple-200"
    case "PAID":
      return "bg-emerald-100 text-emerald-900 border border-emerald-200"
    default:
      return "bg-muted text-foreground border border-border"
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
      className="rounded-xl border bg-card p-4 space-y-3"
      data-testid="open-box-shipment-status-notice"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass(normalized)}`}
          data-testid="open-box-shipment-status-badge"
        >
          {statusLabel(normalized)}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">{body}</p>

      {normalized === "REQUESTED" || normalized === "UNDER_REVIEW" ? (
        <div className="rounded-lg border p-3 text-sm space-y-2">
          <div className="font-medium">What happens next</div>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>We review your shipment request</li>
            <li>We create your shipping invoice</li>
            <li>You pay shipping once the invoice is ready</li>
            <li>We pack and ship your order</li>
          </ol>
        </div>
      ) : null}

      {normalized === "INVOICED" && hasInvoice && !invoicePaid ? (
        <p className="text-sm text-muted-foreground">
          You can continue below to review and pay the shipping invoice.
        </p>
      ) : null}
    </div>
  )
}