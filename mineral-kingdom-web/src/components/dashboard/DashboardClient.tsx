"use client"

import { useEffect, useMemo, useState } from "react"
import { bffFetch, type ApiError } from "@/lib/api/bffFetch"
import type {
  DashboardActionItem,
  DashboardOpenBoxDto,
  DashboardOrderSummaryDto,
  DashboardShippingInvoiceDto,
  DashboardWidgetModel,
  DashboardWonAuctionDto,
  MemberDashboardDto,
} from "@/lib/dashboard/types"
import { DashboardActionStrip } from "@/components/dashboard/DashboardActionStrip"
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

  if (!auctionId || !listingId || currentPriceCents == null || !closeTime || !status) {
    return null
  }

  return {
    auctionId,
    listingId,
    currentPriceCents,
    closeTime,
    status,
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

function isOrderPayable(order: DashboardOrderSummaryDto) {
  const status = normalizeStatus(order.status)
  return status === "AWAITING_PAYMENT" || status === "UNPAID" || status === "PAYMENT_REQUIRED"
}

function isOrderFulfillmentState(order: DashboardOrderSummaryDto) {
  const status = normalizeStatus(order.status)
  return (
    status === "PAID" ||
    status === "READY_TO_FULFILL" ||
    status === "WAITING_FULFILLMENT" ||
    status === "FULFILLING" ||
    status === "SHIPPED" ||
    status === "DELIVERED"
  )
}

function isInvoicePayable(invoice: DashboardShippingInvoiceDto) {
  const status = normalizeStatus(invoice.status)
  return status !== "PAID"
}

function buildActionItems(data: MemberDashboardDto): DashboardActionItem[] {
  const items: DashboardActionItem[] = []

  const payableOrder = data.unpaidAuctionOrders.find(isOrderPayable)
  if (payableOrder) {
    items.push({
      label: `Pay order ${payableOrder.orderNumber}`,
      href: `/orders/${payableOrder.orderId}`,
      tone: "primary",
    })
  }

  const recentOrder = data.paidOrders.find(isOrderFulfillmentState)
  if (recentOrder) {
    items.push({
      label: `View order ${recentOrder.orderNumber}`,
      href: `/orders/${recentOrder.orderId}`,
    })
  }

  const payableInvoice = data.shippingInvoices.find(isInvoicePayable)
  if (payableInvoice) {
    items.push({
      label: `Contact support about shipping invoice`,
      href: `mailto:support@mineralkingdom.net?subject=Shipping%20invoice%20${encodeURIComponent(payableInvoice.shippingInvoiceId)}`,
    })
  }

  return items.slice(0, 4)
}

function buildAuctionsWidget(data: MemberDashboardDto): DashboardWidgetModel {
  const rows = [
    ...data.unpaidAuctionOrders.slice(0, 3).map((order) => ({
      id: order.orderId,
      title: `Auction order ${order.orderNumber}`,
      subtitle: `${order.status} • ${formatMoney(order.totalCents, order.currencyCode)}`,
      meta: order.paymentDueAt ? `Due ${formatDate(order.paymentDueAt)}` : "Auction order",
      action: isOrderPayable(order)
        ? {
          label: "Pay now",
          href: `/orders/${order.orderId}`,
          tone: "primary" as const,
        }
        : {
          label: "View order",
          href: `/orders/${order.orderId}`,
        },
    })),
    ...data.wonAuctions.slice(0, 3).map((auction) => ({
      id: auction.auctionId,
      title: "Won auction",
      subtitle: `${auction.status} • ${formatMoney(auction.currentPriceCents, "USD")}`,
      meta: auction.closeTime ? `Closed ${formatDate(auction.closeTime)}` : null,
      action: null,
    })),
  ].slice(0, 4)

  return {
    title: "Auctions",
    countLabel: "items",
    countValue: data.wonAuctions.length + data.unpaidAuctionOrders.length,
    description: "Track auction wins and any auction orders that still need attention.",
    rows,
    emptyMessage: "You do not have any active wins or auction payment actions right now.",
  }
}

function buildOrdersWidget(data: MemberDashboardDto): DashboardWidgetModel {
  return {
    title: "Orders",
    countLabel: "orders",
    countValue: data.paidOrders.length,
    description: "Recent paid orders that are progressing through fulfillment.",
    rows: data.paidOrders.slice(0, 4).map((order) => ({
      id: order.orderId,
      title: order.orderNumber,
      subtitle: `${order.status} • ${formatMoney(order.totalCents, order.currencyCode)}`,
      meta: `Created ${formatDate(order.createdAt)}`,
      action: {
        label: "View order",
        href: `/orders/${order.orderId}`,
      },
    })),
    emptyMessage: "You do not have any paid orders to review right now.",
  }
}

function buildShippingInvoicesWidget(data: MemberDashboardDto): DashboardWidgetModel {
  return {
    title: "Shipping invoices",
    countLabel: "invoices",
    countValue: data.shippingInvoices.length,
    description: "See shipping invoice status and take the next step when needed.",
    rows: data.shippingInvoices.slice(0, 4).map((invoice) => ({
      id: invoice.shippingInvoiceId,
      title: "Shipping invoice",
      subtitle: `${invoice.status} • ${formatMoney(invoice.amountCents, invoice.currencyCode)}`,
      meta: `Created ${formatDate(invoice.createdAt)}`,
      action: isInvoicePayable(invoice)
        ? {
          label: "Contact support",
          href: `mailto:support@mineralkingdom.net?subject=Shipping%20invoice%20${encodeURIComponent(invoice.shippingInvoiceId)}`,
        }
        : null,
    })),
    emptyMessage: "You do not have any shipping invoices right now.",
  }
}

function buildFulfillmentWidget(data: MemberDashboardDto): DashboardWidgetModel {
  const openBox = data.openBox

  return {
    title: "Fulfillment updates",
    countLabel: "updates",
    countValue: openBox ? openBox.orders.length : 0,
    description: "Monitor grouped fulfillment activity and related order progress.",
    rows:
      openBox?.orders.slice(0, 4).map((order) => ({
        id: order.orderId,
        title: order.orderNumber,
        subtitle: `${openBox.status} • ${formatMoney(order.totalCents, order.currencyCode)}`,
        meta: `Updated ${formatDate(openBox.updatedAt)}`,
        action: {
          label: "View order",
          href: `/orders/${order.orderId}`,
        },
      })) ?? [],
    emptyMessage: "You do not have any fulfillment updates yet.",
  }
}

export function DashboardClient() {
  const [data, setData] = useState<MemberDashboardDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  const actionItems = useMemo(() => (data ? buildActionItems(data) : []), [data])
  const auctionsWidget = useMemo(() => (data ? buildAuctionsWidget(data) : null), [data])
  const ordersWidget = useMemo(() => (data ? buildOrdersWidget(data) : null), [data])
  const shippingInvoicesWidget = useMemo(
    () => (data ? buildShippingInvoicesWidget(data) : null),
    [data],
  )
  const fulfillmentWidget = useMemo(() => (data ? buildFulfillmentWidget(data) : null), [data])

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
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        data-testid="dashboard-loading"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Member dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
          Loading your dashboard
        </h1>
        <p className="mt-2 text-sm text-stone-600 sm:text-base">
          We’re gathering your latest orders, auctions, shipping invoices, and fulfillment updates.
        </p>
      </section>
    )
  }

  if (error) {
    return (
      <section
        className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm"
        data-testid="dashboard-error"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Dashboard</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-red-900">
          We couldn’t load your dashboard
        </h1>
        <p className="mt-2 text-sm text-red-800 sm:text-base">{error}</p>
      </section>
    )
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <DashboardHeader />
      <DashboardActionStrip items={actionItems} />

      {isCompletelyEmpty ? <DashboardEmptyState /> : null}

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
        {fulfillmentWidget ? (
          <DashboardWidgetCard testId="dashboard-widget-fulfillment" model={fulfillmentWidget} />
        ) : null}
      </div>
    </div>
  )
}