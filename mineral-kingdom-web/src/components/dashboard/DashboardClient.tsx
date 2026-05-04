"use client"
import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { bffFetch, type ApiError } from "@/lib/api/bffFetch"
import type {
  DashboardOpenBoxDto,
  DashboardOrderSummaryDto,
  DashboardShippingInvoiceDto,
  DashboardWidgetModel,
  DashboardWonAuctionDto,
  MemberDashboardDto,
} from "@/lib/dashboard/types"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { DashboardWidgetCard } from "@/components/dashboard/DashboardWidgetCard"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function normalizeWonAuction(raw: unknown): DashboardWonAuctionDto | null {
  if (!isRecord(raw)) return null

  const auctionId = asString(raw.auctionId ?? raw.AuctionId)
  const listingId = asString(raw.listingId ?? raw.ListingId)
  const currentPriceCents = asNumber(raw.currentPriceCents ?? raw.CurrentPriceCents)
  const closeTime = asString(raw.closeTime ?? raw.CloseTime)
  const status = asString(raw.status ?? raw.Status)
  const previewTitle = asString(raw.previewTitle ?? raw.PreviewTitle ?? raw.title ?? raw.Title)
  const previewImageUrl = asString(
    raw.previewImageUrl ??
    raw.PreviewImageUrl ??
    raw.primaryImageUrl ??
    raw.PrimaryImageUrl,
  )

  if (!auctionId || !listingId || currentPriceCents == null || !closeTime || !status) {
    return null
  }

  return {
    auctionId,
    listingId,
    currentPriceCents,
    closeTime,
    status,
    previewTitle,
    previewImageUrl,
  }
}

function normalizeOrder(raw: unknown): DashboardOrderSummaryDto | null {
  if (!isRecord(raw)) return null

  const orderId = asString(raw.orderId ?? raw.OrderId)
  const orderNumber = asString(raw.orderNumber ?? raw.OrderNumber)
  const sourceType = asString(raw.sourceType ?? raw.SourceType)
  const status = asString(raw.status ?? raw.Status)
  const totalCents = asNumber(raw.totalCents ?? raw.TotalCents)
  const currencyCode = asString(raw.currencyCode ?? raw.CurrencyCode)
  const createdAt = asString(raw.createdAt ?? raw.CreatedAt)
  const paymentDueAt = asString(raw.paymentDueAt ?? raw.PaymentDueAt)
  const fulfillmentGroupId = asString(raw.fulfillmentGroupId ?? raw.FulfillmentGroupId)
  const shippingMode = asString(raw.shippingMode ?? raw.ShippingMode)
  const itemCount = asNumber(raw.itemCount ?? raw.ItemCount)
  const previewTitle = asString(raw.previewTitle ?? raw.PreviewTitle)
  const previewImageUrl = asString(raw.previewImageUrl ?? raw.PreviewImageUrl)

  if (
    !orderId ||
    !orderNumber ||
    !sourceType ||
    !status ||
    totalCents == null ||
    !currencyCode ||
    !createdAt
  ) {
    return null
  }

  return {
    orderId,
    orderNumber,
    sourceType,
    status,
    totalCents,
    currencyCode,
    createdAt,
    paymentDueAt,
    fulfillmentGroupId,
    shippingMode,
    itemCount: itemCount ?? 0,
    previewTitle,
    previewImageUrl,
  }
}

function normalizeOpenBox(raw: unknown): DashboardOpenBoxDto | null {
  if (!isRecord(raw)) return null

  const fulfillmentGroupId = asString(raw.fulfillmentGroupId ?? raw.FulfillmentGroupId)
  const status = asString(raw.status ?? raw.Status)
  const updatedAt = asString(raw.updatedAt ?? raw.UpdatedAt)
  const ordersRaw = asArray(raw.orders ?? raw.Orders)

  if (!fulfillmentGroupId || !status || !updatedAt) {
    return null
  }

  return {
    fulfillmentGroupId,
    status,
    updatedAt,
    orders: ordersRaw
      .map((value: unknown) => normalizeOrder(value))
      .filter((value: DashboardOrderSummaryDto | null): value is DashboardOrderSummaryDto => value !== null),
  }
}

function normalizeShippingInvoice(raw: unknown): DashboardShippingInvoiceDto | null {
  if (!isRecord(raw)) return null

  const shippingInvoiceId = asString(raw.shippingInvoiceId ?? raw.ShippingInvoiceId)
  const fulfillmentGroupId = asString(raw.fulfillmentGroupId ?? raw.FulfillmentGroupId)
  const amountCents = asNumber(raw.amountCents ?? raw.AmountCents)
  const currencyCode = asString(raw.currencyCode ?? raw.CurrencyCode)
  const status = asString(raw.status ?? raw.Status)
  const provider = asString(raw.provider ?? raw.Provider)
  const providerCheckoutId = asString(raw.providerCheckoutId ?? raw.ProviderCheckoutId)
  const paidAt = asString(raw.paidAt ?? raw.PaidAt)
  const createdAt = asString(raw.createdAt ?? raw.CreatedAt)
  const itemCount = asNumber(raw.itemCount ?? raw.ItemCount)
  const previewTitle = asString(raw.previewTitle ?? raw.PreviewTitle)
  const previewImageUrl = asString(raw.previewImageUrl ?? raw.PreviewImageUrl)
  const auctionOrderCount = asNumber(raw.auctionOrderCount ?? raw.AuctionOrderCount)
  const storeOrderCount = asNumber(raw.storeOrderCount ?? raw.StoreOrderCount)
  const relatedOrdersRaw = asArray(raw.relatedOrders ?? raw.RelatedOrders)

  if (
    !shippingInvoiceId ||
    !fulfillmentGroupId ||
    amountCents == null ||
    !currencyCode ||
    !status ||
    !createdAt
  ) {
    return null
  }

  return {
    shippingInvoiceId,
    fulfillmentGroupId,
    amountCents,
    currencyCode,
    status,
    provider,
    providerCheckoutId,
    paidAt,
    createdAt,
    itemCount: itemCount ?? 0,
    previewTitle,
    previewImageUrl,
    auctionOrderCount: auctionOrderCount ?? 0,
    storeOrderCount: storeOrderCount ?? 0,
    relatedOrders: relatedOrdersRaw
      .map((value: unknown) => {
        if (!isRecord(value)) return null

        const orderId = asString(value.orderId ?? value.OrderId)
        const orderNumber = asString(value.orderNumber ?? value.OrderNumber)
        const sourceType = asString(value.sourceType ?? value.SourceType)

        if (!orderId || !orderNumber || !sourceType) return null

        return { orderId, orderNumber, sourceType }
      })
      .filter(
        (
          value: { orderId: string; orderNumber: string; sourceType: string } | null,
        ): value is { orderId: string; orderNumber: string; sourceType: string } => value !== null,
      ),
  }
}

function normalizeDashboard(raw: unknown): MemberDashboardDto {
  const dto: Record<string, unknown> = isRecord(raw) ? raw : {}

  const wonAuctionsRaw = asArray(dto.wonAuctions ?? dto.WonAuctions)
  const unpaidAuctionOrdersRaw = asArray(dto.unpaidAuctionOrders ?? dto.UnpaidAuctionOrders)
  const paidOrdersRaw = asArray(dto.paidOrders ?? dto.PaidOrders)
  const openBoxRaw = dto.openBox ?? dto.OpenBox ?? null
  const shippingInvoicesRaw = asArray(dto.shippingInvoices ?? dto.ShippingInvoices)

  return {
    wonAuctions: wonAuctionsRaw
      .map((value: unknown) => normalizeWonAuction(value))
      .filter((value: DashboardWonAuctionDto | null): value is DashboardWonAuctionDto => value !== null),
    unpaidAuctionOrders: unpaidAuctionOrdersRaw
      .map((value: unknown) => normalizeOrder(value))
      .filter((value: DashboardOrderSummaryDto | null): value is DashboardOrderSummaryDto => value !== null),
    paidOrders: paidOrdersRaw
      .map((value: unknown) => normalizeOrder(value))
      .filter((value: DashboardOrderSummaryDto | null): value is DashboardOrderSummaryDto => value !== null),
    openBox: normalizeOpenBox(openBoxRaw),
    shippingInvoices: shippingInvoicesRaw
      .map((value: unknown) => normalizeShippingInvoice(value))
      .filter(
        (value: DashboardShippingInvoiceDto | null): value is DashboardShippingInvoiceDto =>
          value !== null,
      ),
  }
}

function formatMoney(cents?: number | null, currencyCode?: string | null) {
  if (cents == null) return "—"

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode ?? "USD",
  }).format(cents / 100)
}

function formatDashboardOrderStatus(value?: string | null) {
  switch (normalizeStatus(value)) {
    case "READY_TO_FULFILL":
      return "Ready to fulfill"
    case "PACKED":
      return "Packed"
    case "SHIPPED":
      return "Shipped"
    case "DELIVERED":
      return "Delivered"
    case "COMPLETED":
      return "Completed"
    case "AWAITING_PAYMENT":
      return "Awaiting payment"
    default:
      return value ?? "—"
  }
}

function formatDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

function normalizeStatus(value?: string | null) {
  return (value ?? "").trim().toUpperCase()
}

function normalizeShippingMode(value?: string | null) {
  return (value ?? "").trim().toUpperCase()
}

function formatShippingMode(value?: string | null) {
  switch (normalizeShippingMode(value)) {
    case "UNSELECTED":
      return "Shipping choice needed"
    case "SHIP_NOW":
      return "Direct shipment"
    case "OPEN_BOX":
      return "Open Box"
    default:
      return "Shipping details pending"
  }
}

function isOrderPayable(order: DashboardOrderSummaryDto) {
  const status = normalizeStatus(order.status)
  return status === "AWAITING_PAYMENT" || status === "UNPAID" || status === "PAYMENT_REQUIRED"
}

function isCompletedOrder(order: DashboardOrderSummaryDto) {
  const status = normalizeStatus(order.status)
  return status === "DELIVERED" || status === "COMPLETED"
}

function isOrderFulfillmentState(order: DashboardOrderSummaryDto) {
  const status = normalizeStatus(order.status)
  return (
    status === "PAID" ||
    status === "READY_TO_FULFILL" ||
    status === "WAITING_FULFILLMENT" ||
    status === "FULFILLING" ||
    status === "PACKED" ||
    status === "SHIPPED"
  )
}

function isInvoicePayable(invoice: DashboardShippingInvoiceDto) {
  return normalizeStatus(invoice.status) === "UNPAID"
}

function isInvoiceAwaitingConfirmation(invoice: DashboardShippingInvoiceDto) {
  const status = normalizeStatus(invoice.status)
  return status === "PROCESSING" || status === "PENDING" || status === "CONFIRMING"
}

function buildTitle(previewTitle?: string | null, itemCount?: number) {
  const title = previewTitle?.trim()
  const count = itemCount ?? 0

  if (title && count > 1) {
    return `${title} + ${count - 1} more`
  }

  if (title) return title

  if (count > 1) return `${count} items`
  if (count === 1) return "1 item"

  return "Untitled item"
}

function orderContext(order: DashboardOrderSummaryDto) {
  const type = order.sourceType === "AUCTION" ? "Auction" : "Order"
  const due = order.paymentDueAt ? ` • Due ${formatDate(order.paymentDueAt)}` : ""
  return `Order ${order.orderNumber} • ${type}${due}`
}

function openBoxOrderContext(order: DashboardOrderSummaryDto) {
  const type = order.sourceType === "AUCTION" ? "Auction" : "Store"
  return `Order ${order.orderNumber} • ${type} • ${formatDashboardOrderStatus(order.status)}`
}

function shippingInvoiceContext(invoice: DashboardShippingInvoiceDto) {
  const firstOrder = invoice.relatedOrders[0]

  if (invoice.relatedOrders.length === 1 && firstOrder) {
    return `Shipping invoice • Open Box • Order ${firstOrder.orderNumber}`
  }

  if (firstOrder && invoice.relatedOrders.length > 1) {
    return `Shipping invoice • Open Box • Order ${firstOrder.orderNumber} + ${invoice.relatedOrders.length - 1} more`
  }

  return "Shipping invoice • Open Box"
}

function Thumbnail({
  src,
  alt,
  fallback,
  testId,
}: {
  src?: string | null
  alt: string
  fallback: string
  testId?: string
}) {
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)]"
      data-testid={testId}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span className="px-2 text-center text-[11px] font-semibold text-[color:var(--mk-gold)]">
          {fallback}
        </span>
      )}
    </div>
  )
}

function ActionRow({
  title,
  context,
  helper,
  amount,
  ctaLabel,
  href,
  imageUrl,
  imageAlt,
  testId,
}: {
  title: string
  context: string
  helper: string
  amount: string
  ctaLabel: string
  href: string
  imageUrl?: string | null
  imageAlt: string
  testId: string
}) {
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 sm:flex-row sm:items-start"
      data-testid={testId}
    >
      <Thumbnail
        src={imageUrl}
        alt={imageAlt}
        fallback="Mineral"
        testId={`${testId}-thumbnail`}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[color:var(--mk-ink)]">{title}</p>
        <p className="mt-1 text-sm mk-muted-text">{context}</p>
        <p className="mt-1 text-sm mk-muted-text">{helper}</p>
      </div>

      <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
        <p className="text-sm font-semibold text-[color:var(--mk-ink)]">{amount}</p>
        <Link
          href={href}
          className="mk-cta inline-flex rounded-2xl px-4 py-2 text-sm font-semibold"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  )
}

function ActionSection({
  title,
  description,
  children,
  testId,
}: {
  title: string
  description: string
  children: ReactNode
  testId: string
}) {
  return (
    <section className="mk-glass-strong rounded-[2rem] p-5" data-testid={testId}>
      <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">{title}</h2>
      <p className="mt-1 text-sm leading-6 mk-muted-text">{description}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  )
}

function OpenBoxOrderRow({ order }: { order: DashboardOrderSummaryDto }) {
  return (
    <li
      className="flex flex-col gap-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] p-4 sm:flex-row sm:items-start"
      data-testid="dashboard-open-box-order-row"
    >
      <Thumbnail
        src={order.previewImageUrl}
        alt={order.previewTitle ?? order.orderNumber}
        fallback="Order"
        testId={`dashboard-open-box-order-${order.orderId}-thumbnail`}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[color:var(--mk-ink)]">
          {buildTitle(order.previewTitle, order.itemCount)}
        </p>
        <p className="mt-1 text-sm mk-muted-text">{openBoxOrderContext(order)}</p>
      </div>

      <Link
        href={`/orders/${order.orderId}`}
        className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel)]"
        data-testid={`dashboard-open-box-order-${order.orderId}-view`}
      >
        View
      </Link>
    </li>
  )
}

function InProgressSection({ data }: { data: MemberDashboardDto }) {
  const openBox = data.openBox
  const paidOrders = data.paidOrders.filter(isOrderFulfillmentState).slice(0, 4)
  const pendingInvoices = data.shippingInvoices
    .filter(isInvoiceAwaitingConfirmation)
    .slice(0, 4)

  if (!openBox && paidOrders.length === 0 && pendingInvoices.length === 0) {
    return null
  }

  return (
    <section
      className="mk-glass-strong rounded-[2rem] p-5 shadow-sm"
      data-testid="dashboard-in-progress"
    >
      <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">In progress</h2>
      <p className="mt-1 text-sm mk-muted-text">
        Items you already paid for that are still moving through Open Box or fulfillment.
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        {openBox ? (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
              Open Box
            </h3>
            <div
              className="mt-3 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
              data-testid="dashboard-open-box-card"
            >
              <p
                className="text-sm font-semibold text-[color:var(--mk-ink)]"
                data-testid="dashboard-open-box-count"
              >
                {openBox.orders.length} item{openBox.orders.length === 1 ? "" : "s"} currently in your Open Box
              </p>
              <p className="mt-1 text-sm mk-muted-text">
                Status: {openBox.status} • Updated {formatDate(openBox.updatedAt) ?? "recently"}
              </p>

              {openBox.orders.length > 0 ? (
                <ul className="mt-4 space-y-3" data-testid="dashboard-open-box-orders">
                  {openBox.orders.slice(0, 4).map((order) => (
                    <OpenBoxOrderRow key={order.orderId} order={order} />
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm mk-muted-text" data-testid="dashboard-open-box-empty">
                  Your Open Box exists, but orders are not visible yet.
                </p>
              )}

              <div className="mt-4">
                <Link
                  href="/open-box"
                  className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
                  data-testid="dashboard-open-box-view-link"
                >
                  View Open Box
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {paidOrders.length > 0 ? (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
              Orders in fulfillment
            </h3>
            <div className="mt-3 space-y-3">
              {paidOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="flex items-start gap-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
                >
                  <Thumbnail
                    src={order.previewImageUrl}
                    alt={order.previewTitle ?? order.orderNumber}
                    fallback="Order"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[color:var(--mk-ink)]">
                      {buildTitle(order.previewTitle, order.itemCount)}
                    </p>
                    <p className="mt-1 text-sm mk-muted-text">
                      Order {order.orderNumber} • {formatDashboardOrderStatus(order.status)}
                      {order.shippingMode ? ` • ${formatShippingMode(order.shippingMode)}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/orders/${order.orderId}`}
                    className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {pendingInvoices.length > 0 ? (
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
              Shipping awaiting confirmation
            </h3>
            <div className="mt-3 space-y-3">
              {pendingInvoices.map((invoice) => (
                <div
                  key={invoice.shippingInvoiceId}
                  className="flex items-start gap-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
                >
                  <Thumbnail
                    src={invoice.previewImageUrl}
                    alt={invoice.previewTitle ?? "Shipping invoice"}
                    fallback="Ship"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[color:var(--mk-ink)]">
                      {buildTitle(invoice.previewTitle, invoice.itemCount)}
                    </p>
                    <p className="mt-1 text-sm mk-muted-text">{shippingInvoiceContext(invoice)}</p>
                  </div>
                  <Link
                    href={`/shipping-invoices/${invoice.shippingInvoiceId}`}
                    className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function CompletedOrdersSection({ data }: { data: MemberDashboardDto }) {
  const completedOrders = data.paidOrders.filter(isCompletedOrder).slice(0, 6)

  if (completedOrders.length === 0) {
    return null
  }

  return (
    <section
      className="mk-glass-strong rounded-[2rem] p-5 shadow-sm"
      data-testid="dashboard-completed-orders"
    >
      <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Completed orders</h2>
      <p className="mt-1 text-sm mk-muted-text">
        Orders that have been delivered or fully completed.
      </p>

      <div className="mt-4 space-y-3">
        {completedOrders.map((order) => (
          <div
            key={order.orderId}
            className="flex items-start gap-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
            data-testid={`dashboard-completed-order-${order.orderId}`}
          >
            <Thumbnail
              src={order.previewImageUrl}
              alt={order.previewTitle ?? order.orderNumber}
              fallback="Order"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[color:var(--mk-ink)]">
                {buildTitle(order.previewTitle, order.itemCount)}
              </p>
              <p className="mt-1 text-sm mk-muted-text">
                Order {order.orderNumber} • {formatDashboardOrderStatus(order.status)}
                {order.shippingMode ? ` • ${formatShippingMode(order.shippingMode)}` : ""}
              </p>
              <p className="mt-1 text-sm font-semibold text-[color:var(--mk-ink)]">
                {formatMoney(order.totalCents, order.currencyCode)}
              </p>
            </div>

            <Link
              href={`/orders/${order.orderId}`}
              className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
            >
              View
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

function buildAuctionsWidget(data: MemberDashboardDto): DashboardWidgetModel {
  return {
    title: "Won auctions",
    countLabel: "wins",
    countValue: data.wonAuctions.length,
    description: "Past auction wins and recently closed results.",
    rows: data.wonAuctions.slice(0, 4).map((auction) => ({
      id: auction.auctionId,
      title: auction.previewTitle?.trim() || "Won auction",
      subtitle: `${auction.status} • ${formatMoney(auction.currentPriceCents, "USD")}`,
      meta: auction.closeTime ? `Closed ${formatDate(auction.closeTime)}` : null,
      imageUrl: auction.previewImageUrl,
      imageAlt: auction.previewTitle ?? "Won auction",
      action: {
        label: "View auction",
        href: `/auctions/${auction.auctionId}`,
      },
    })),
    emptyMessage: "You do not have any past auction wins to show yet.",
  }
}

function buildOrdersWidget(data: MemberDashboardDto): DashboardWidgetModel {
  const recentNonCompletedOrders = data.paidOrders
    .filter((order) => !isCompletedOrder(order))
    .slice(0, 4)

  return {
    title: "Recent paid orders",
    countLabel: "orders",
    countValue: recentNonCompletedOrders.length,
    description: "Recent paid orders that are not yet in the completed bucket.",
    rows: recentNonCompletedOrders.map((order) => ({
      id: order.orderId,
      title: buildTitle(order.previewTitle, order.itemCount),
      subtitle: `${formatDashboardOrderStatus(order.status)} • ${formatMoney(order.totalCents, order.currencyCode)}`,
      meta: `Created ${formatDate(order.createdAt)}`,
      imageUrl: order.previewImageUrl,
      imageAlt: order.previewTitle ?? order.orderNumber,
      action: {
        label: "View order",
        href: `/orders/${order.orderId}`,
      },
    })),
    emptyMessage: "You do not have any recent non-completed paid orders right now.",
  }
}

function buildShippingInvoicesWidget(data: MemberDashboardDto): DashboardWidgetModel {
  return {
    title: "Past shipping invoices",
    countLabel: "invoices",
    countValue: data.shippingInvoices.length,
    description: "Past and current shipping invoices for your Open Box shipments.",
    rows: data.shippingInvoices.slice(0, 4).map((invoice) => ({
      id: invoice.shippingInvoiceId,
      title: buildTitle(invoice.previewTitle, invoice.itemCount),
      subtitle: `${invoice.status} • ${formatMoney(invoice.amountCents, invoice.currencyCode)}`,
      meta: shippingInvoiceContext(invoice),
      imageUrl: invoice.previewImageUrl,
      imageAlt: invoice.previewTitle ?? "Shipping invoice",
      action: {
        label: "View invoice",
        href: `/shipping-invoices/${invoice.shippingInvoiceId}`,
      },
    })),
    emptyMessage: "You do not have any shipping invoices right now.",
  }
}

export function DashboardClient() {
  const [data, setData] = useState<MemberDashboardDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)

  const searchParams = useSearchParams()
  const isWelcome = searchParams.get("welcome") === "1"

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const result = await bffFetch<unknown>("/api/bff/me/dashboard")

        if (!isMounted) return

        setData(normalizeDashboard(result))
        setIsLoading(false)
      } catch (err) {
        if (!isMounted) return

        const apiError = err as ApiError
        setError(apiError?.message ?? "We couldn’t load your dashboard right now.")
        setIsLoading(false)
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [])

  const auctionsWidget = useMemo(() => (data ? buildAuctionsWidget(data) : null), [data])
  const ordersWidget = useMemo(() => (data ? buildOrdersWidget(data) : null), [data])
  const shippingInvoicesWidget = useMemo(
    () => (data ? buildShippingInvoicesWidget(data) : null),
    [data],
  )

  const payableOrders = useMemo(
    () => (data ? data.unpaidAuctionOrders.filter(isOrderPayable).slice(0, 6) : []),
    [data],
  )

  const payableInvoices = useMemo(
    () => (data ? data.shippingInvoices.filter(isInvoicePayable).slice(0, 4) : []),
    [data],
  )

  const isCompletelyEmpty =
    data != null &&
    data.wonAuctions.length === 0 &&
    data.unpaidAuctionOrders.length === 0 &&
    data.paidOrders.length === 0 &&
    data.shippingInvoices.length === 0 &&
    !data.openBox

  if (isLoading) {
    return (
      <section
        className="mk-glass-strong rounded-[2rem] p-6"
        data-testid="dashboard-loading"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Member dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
          Loading your dashboard
        </h1>
        <p className="mt-2 text-sm leading-6 mk-muted-text sm:text-base">
          We’re gathering your latest orders, auctions, shipping invoices, and fulfillment updates.
        </p>
      </section>
    )
  }

  if (error) {
    return (
      <section
        className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-6 shadow-sm"
        data-testid="dashboard-error"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-danger)]">
          Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
          We couldn’t load your dashboard
        </h1>
        <p className="mt-2 text-sm leading-6 mk-muted-text sm:text-base">{error}</p>
      </section>
    )
  }

  const hasActionItems = payableOrders.length > 0 || payableInvoices.length > 0
  const showWelcomeBanner = isWelcome && !welcomeDismissed && data !== null

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <DashboardHeader />

      {showWelcomeBanner ? (
        <div
          className={[
            "rounded-[2rem] border bg-[color:var(--mk-panel-muted)] p-4 shadow-sm",
            hasActionItems
              ? "border-[color:var(--mk-border-strong)]"
              : "border-[color:var(--mk-success)]/40",
          ].join(" ")}
          data-testid="dashboard-welcome-banner"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              {hasActionItems ? (
                <>
                  <p className="text-sm font-semibold text-[color:var(--mk-ink)]">
                    Welcome back! You have items that need your attention.
                  </p>
                  <ul className="mt-2 space-y-1 text-sm mk-muted-text">
                    {payableOrders.length > 0 ? (
                      <li>
                        &bull; {payableOrders.length} unpaid auction order
                        {payableOrders.length === 1 ? "" : "s"} — see “Action needed” below
                      </li>
                    ) : null}
                    {payableInvoices.length > 0 ? (
                      <li>
                        &bull; {payableInvoices.length} shipping invoice
                        {payableInvoices.length === 1 ? "" : "s"} ready for payment — see “Action
                        needed” below
                      </li>
                    ) : null}
                  </ul>
                </>
              ) : (
                <p className="text-sm font-semibold text-[color:var(--mk-success)]">
                  Welcome back! Your account is all caught up.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setWelcomeDismissed(true)}
              className="shrink-0 rounded-xl p-1 mk-muted-text transition hover:bg-[color:var(--mk-panel)] hover:text-[color:var(--mk-ink)]"
              aria-label="Dismiss"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      {(payableOrders.length > 0 || payableInvoices.length > 0) ? (
        <section className="space-y-4" data-testid="dashboard-action-needed">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Action needed</h2>
            <p className="mt-1 text-sm mk-muted-text">
              Review item payments and Open Box shipping payments that still need attention.
            </p>
          </div>

          <div className="space-y-4">
            {payableOrders.length > 0 ? (
              <ActionSection
                title="Orders to complete"
                description="Auction orders that still need shipping selection or payment."
                testId="dashboard-action-orders"
              >
                {payableOrders.map((order) => {
                  const shippingMode = normalizeShippingMode(order.shippingMode)
                  return (
                    <ActionRow
                      key={order.orderId}
                      testId={`dashboard-action-order-${order.orderId}`}
                      title={buildTitle(order.previewTitle, order.itemCount)}
                      context={orderContext(order)}
                      helper={formatShippingMode(order.shippingMode)}
                      amount={formatMoney(order.totalCents, order.currencyCode)}
                      ctaLabel={shippingMode === "UNSELECTED" ? "Choose shipping" : "Pay now"}
                      href={`/orders/${order.orderId}`}
                      imageUrl={order.previewImageUrl}
                      imageAlt={order.previewTitle ?? order.orderNumber}
                    />
                  )
                })}
              </ActionSection>
            ) : null}

            {payableInvoices.length > 0 ? (
              <ActionSection
                title="Shipping to pay"
                description="Open Box shipping invoices that are ready for payment."
                testId="dashboard-action-shipping"
              >
                {payableInvoices.map((invoice) => (
                  <ActionRow
                    key={invoice.shippingInvoiceId}
                    testId={`dashboard-action-shipping-${invoice.shippingInvoiceId}`}
                    title={buildTitle(invoice.previewTitle, invoice.itemCount)}
                    context={shippingInvoiceContext(invoice)}
                    helper={`${formatMoney(invoice.amountCents, invoice.currencyCode)} due`}
                    amount={formatMoney(invoice.amountCents, invoice.currencyCode)}
                    ctaLabel="Pay shipping"
                    href={`/shipping-invoices/${invoice.shippingInvoiceId}`}
                    imageUrl={invoice.previewImageUrl}
                    imageAlt={invoice.previewTitle ?? "Shipping invoice"}
                  />
                ))}
              </ActionSection>
            ) : null}
          </div>
        </section>
      ) : null}

      <InProgressSection data={data!} />

      <CompletedOrdersSection data={data!} />

      {isCompletelyEmpty ? <DashboardEmptyState /> : null}

      <section
        className="mk-glass-strong rounded-[2rem] p-5"
        data-testid="dashboard-support-section"
      >
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Support</h2>
        <p className="mt-1 text-sm leading-6 mk-muted-text">
          Questions about an order, auction, or shipment? We&apos;re here to help.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/support"
            className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
            data-testid="dashboard-support-view-tickets"
          >
            View my tickets
          </Link>
          <Link
            href="/support/new"
            className="mk-cta inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold"
            data-testid="dashboard-support-new-ticket"
          >
            Open a ticket
          </Link>
        </div>
      </section>

      <section className="space-y-4" data-testid="dashboard-history">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">History</h2>
          <p className="mt-1 text-sm leading-6 mk-muted-text">
            Recent wins, paid orders, and shipping records in your account.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {auctionsWidget ? (
            <DashboardWidgetCard testId="dashboard-widget-auctions" model={auctionsWidget} />
          ) : null}
          {ordersWidget ? (
            <DashboardWidgetCard testId="dashboard-widget-orders" model={ordersWidget} />
          ) : null}
          {shippingInvoicesWidget ? (
            <DashboardWidgetCard
              testId="dashboard-widget-shipping-invoices"
              model={shippingInvoicesWidget}
            />
          ) : null}
        </div>
      </section>
    </div>
  )
}