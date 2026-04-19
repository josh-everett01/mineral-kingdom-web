"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { PaymentContextRow } from '../payments/PaymentContextRow'
import { PaymentStatusPanel } from "@/components/payments/PaymentStatusPanel"
import { useSse } from "@/lib/sse/useSse"

type Props = {
  orderId: string
}

type OrderTimelineEntryDto = {
  type?: string
  title?: string
  description?: string | null
  occurredAt?: string | null
}

type OrderStatusHistoryDto = {
  entries?: OrderTimelineEntryDto[] | null
}

type OrderLineDto = {
  id?: string
  offerId?: string | null
  listingId?: string
  listingSlug?: string | null
  title?: string | null
  primaryImageUrl?: string | null
  mineralName?: string | null
  locality?: string | null
  quantity?: number
  unitPriceCents?: number
  unitDiscountCents?: number
  unitFinalPriceCents?: number
  lineSubtotalCents?: number
  lineDiscountCents?: number
  lineTotalCents?: number
}

type OrderDto = {
  id?: string
  userId?: string | null
  orderNumber?: string | null
  sourceType?: string | null
  auctionId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  paymentDueAt?: string | null
  shippingMode?: string | null
  requiresShippingInvoice?: boolean
  shippingAmountCents?: number
  subtotalCents?: number
  discountTotalCents?: number
  totalCents?: number
  currencyCode?: string | null
  status?: string | null
  paymentStatus?: string | null
  paymentProvider?: string | null
  paidAt?: string | null
  fulfillmentGroupId?: string | null

  fulfillmentStatus?: string | null
  boxStatus?: string | null
  shipmentRequestStatus?: string | null
  packedAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  shippingCarrier?: string | null
  trackingNumber?: string | null
  shippingInvoiceId?: string | null
  shippingInvoiceStatus?: string | null

  statusHistory?: OrderStatusHistoryDto | null
  lines?: OrderLineDto[] | null
}

type StartOrderPaymentResponse = {
  orderPaymentId?: string
  provider?: string | null
  status?: string | null
  redirectUrl?: string | null
}

type AuctionShippingChoiceResponse = {
  orderId?: string
  shippingMode?: string | null
  subtotalCents?: number
  discountTotalCents?: number
  shippingAmountCents?: number
  totalCents?: number
  currencyCode?: string | null
  auctionId?: string | null
  quotedShippingCents?: number | null
}

type OrderRealtimeSnapshot = {
  orderId?: string
  userId?: string | null
  orderNumber?: string | null
  status?: string | null
  paymentStatus?: string | null
  paymentProvider?: string | null
  paidAt?: string | null
  paymentDueAt?: string | null
  totalCents?: number
  currencyCode?: string | null
  sourceType?: string | null
  auctionId?: string | null
  fulfillmentGroupId?: string | null
  updatedAt?: string | null
  newTimelineEntries?: OrderTimelineEntryDto[] | null
}

type LoadableError = {
  status?: number
  message?: string
  error?: string
  code?: string
}

type ShippingMode = "UNSELECTED" | "SHIP_NOW" | "OPEN_BOX"

function formatMoney(cents?: number | null, currencyCode?: string | null) {
  if (cents == null) return null

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode ?? "USD",
  }).format(cents / 100)
}

function formatDateTime(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
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

function formatPaymentStatus(value?: string | null) {
  if (!value) return "—"

  switch (value.toUpperCase()) {
    case "SUCCEEDED":
      return "Paid"
    case "PENDING":
      return "Pending"
    case "FAILED":
      return "Failed"
    case "REDIRECTED":
      return "Redirected"
    case "CREATED":
      return "Created"
    default:
      return value
  }
}

function formatPaymentProvider(value?: string | null) {
  if (!value) return "—"

  switch (value.toUpperCase()) {
    case "STRIPE":
      return "Stripe"
    case "PAYPAL":
      return "PayPal"
    default:
      return value
  }
}

function formatOrderStatus(value?: string | null) {
  if (!value) return "—"

  switch (value.toUpperCase()) {
    case "AWAITING_PAYMENT":
      return "Awaiting payment"
    case "READY_TO_FULFILL":
      return "Paid / Ready to fulfill"
    case "DRAFT":
      return "Draft"
    default:
      return value.replaceAll("_", " ")
  }
}

function formatShippingMode(value?: string | null) {
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

function formatFulfillmentStatus(value?: string | null) {
  if (!value) return "—"

  switch (value.toUpperCase()) {
    case "READY_TO_FULFILL":
      return "Ready to fulfill"
    case "PACKED":
      return "Packed"
    case "SHIPPED":
      return "Shipped"
    case "DELIVERED":
      return "Delivered"
    default:
      return value.replaceAll("_", " ")
  }
}

function formatShipmentRequestStatus(value?: string | null) {
  if (!value) return "—"

  switch (value.toUpperCase()) {
    case "NONE":
      return "No shipping invoice needed"
    case "REQUESTED":
      return "Shipment requested"
    case "UNDER_REVIEW":
      return "Under review"
    case "INVOICED":
      return "Shipping invoice created"
    case "PAID":
      return "Shipping invoice paid"
    default:
      return value.replaceAll("_", " ")
  }
}

function formatBoxStatus(value?: string | null) {
  if (!value) return "—"

  switch (value.toUpperCase()) {
    case "OPEN":
      return "Open Box"
    case "LOCKED_FOR_REVIEW":
      return "Open Box locked for review"
    case "CLOSED":
      return "Direct shipment / closed group"
    case "SHIPPED":
      return "Shipped"
    default:
      return value.replaceAll("_", " ")
  }
}

function isOpenBoxOrder(order: OrderDto | null) {
  return (order?.shippingMode ?? "").toUpperCase() === "OPEN_BOX"
}

function isAwaitingPayment(order: OrderDto | null) {
  return order?.status === "AWAITING_PAYMENT"
}

function isPaidOrder(order: OrderDto | null) {
  return order?.status === "READY_TO_FULFILL"
}

function isAuctionAwaitingShippingChoice(order: OrderDto | null) {
  return (
    order?.sourceType === "AUCTION" &&
    order?.status === "AWAITING_PAYMENT" &&
    (order?.shippingMode ?? "UNSELECTED") === "UNSELECTED"
  )
}

function isAwaitingProviderConfirmation(order: OrderDto | null) {
  const paymentStatus = order?.paymentStatus?.toUpperCase()
  return isAwaitingPayment(order) && (paymentStatus === "PENDING" || paymentStatus === "REDIRECTED")
}

function buildOrderPaymentTitle(order: OrderDto | null) {
  if (!order) return "Order"

  const lines = order.lines ?? []
  const firstTitle = lines[0]?.title?.trim()

  if (firstTitle && lines.length > 1) {
    return `${firstTitle} + ${lines.length - 1} more`
  }

  if (firstTitle) return firstTitle
  return `Order ${order.orderNumber ?? ""}`.trim()
}

function buildOrderPaymentContext(order: OrderDto | null) {
  if (!order) return "Order payment"

  const sourceType =
    order.sourceType?.toUpperCase() === "AUCTION"
      ? "Auction"
      : order.sourceType?.toUpperCase() === "STORE"
        ? "Store"
        : "Order"

  return `Order ${order.orderNumber ?? "—"} • ${sourceType}`
}

function buildOrderPaymentHelper(order: OrderDto | null) {
  if (!order) return null

  const parts: string[] = []

  if (order.paymentDueAt) {
    const formatted = formatDate(order.paymentDueAt)
    if (formatted) {
      parts.push(`Due ${formatted}`)
    }
  }

  if (order.shippingMode) {
    const shippingMode = order.shippingMode.toUpperCase()
    if (shippingMode === "UNSELECTED") {
      parts.push("Shipping not selected")
    } else if (shippingMode === "SHIP_NOW") {
      parts.push("Ship now selected")
    } else if (shippingMode === "OPEN_BOX") {
      parts.push("Open Box selected")
    }
  }

  return parts.length > 0 ? parts.join(" • ") : null
}

function buildOrderPaymentImage(order: OrderDto | null) {
  if (!order?.lines?.length) return null
  return order.lines[0]?.primaryImageUrl ?? null
}

function normalizeSseSnapshot(payload: unknown): OrderRealtimeSnapshot {
  const source = (payload ?? {}) as Record<string, unknown>

  return {
    orderId: typeof source.OrderId === "string" ? source.OrderId : undefined,
    userId:
      typeof source.UserId === "string" || source.UserId === null
        ? (source.UserId as string | null)
        : undefined,
    orderNumber: typeof source.OrderNumber === "string" ? source.OrderNumber : undefined,
    status: typeof source.Status === "string" ? source.Status : undefined,
    paymentStatus: typeof source.PaymentStatus === "string" ? source.PaymentStatus : undefined,
    paymentProvider:
      typeof source.PaymentProvider === "string" ? source.PaymentProvider : undefined,
    paidAt:
      typeof source.PaidAt === "string" || source.PaidAt === null
        ? (source.PaidAt as string | null)
        : undefined,
    paymentDueAt:
      typeof source.PaymentDueAt === "string" || source.PaymentDueAt === null
        ? (source.PaymentDueAt as string | null)
        : undefined,
    totalCents: typeof source.TotalCents === "number" ? source.TotalCents : undefined,
    currencyCode: typeof source.CurrencyCode === "string" ? source.CurrencyCode : undefined,
    sourceType: typeof source.SourceType === "string" ? source.SourceType : undefined,
    auctionId:
      typeof source.AuctionId === "string" || source.AuctionId === null
        ? (source.AuctionId as string | null)
        : undefined,
    fulfillmentGroupId:
      typeof source.FulfillmentGroupId === "string" || source.FulfillmentGroupId === null
        ? (source.FulfillmentGroupId as string | null)
        : undefined,
    updatedAt:
      typeof source.UpdatedAt === "string" || source.UpdatedAt === null
        ? (source.UpdatedAt as string | null)
        : undefined,
    newTimelineEntries: Array.isArray(source.NewTimelineEntries)
      ? (source.NewTimelineEntries as OrderTimelineEntryDto[])
      : null,
  }
}

function mergeTimelineEntries(
  existing: OrderTimelineEntryDto[] | null | undefined,
  incoming: OrderTimelineEntryDto[] | null | undefined,
) {
  const current = [...(existing ?? [])]

  for (const entry of incoming ?? []) {
    const key = `${entry.type ?? ""}|${entry.occurredAt ?? ""}|${entry.title ?? ""}`
    const exists = current.some(
      (candidate) =>
        `${candidate.type ?? ""}|${candidate.occurredAt ?? ""}|${candidate.title ?? ""}` === key,
    )

    if (!exists) {
      current.push(entry)
    }
  }

  return current.sort((a, b) => {
    const aTime = a.occurredAt ? new Date(a.occurredAt).getTime() : 0
    const bTime = b.occurredAt ? new Date(b.occurredAt).getTime() : 0
    return aTime - bTime
  })
}

function deriveSseFallbackTimelineEntry(
  previous: OrderDto | null,
  snapshot: OrderRealtimeSnapshot | null,
): OrderTimelineEntryDto[] {
  if (!previous || !snapshot?.status || previous.status === snapshot.status) {
    return []
  }

  if (snapshot.status === "READY_TO_FULFILL") {
    return [
      {
        type: "READY_TO_FULFILL",
        title: "Ready to fulfill",
        description: "Payment has been confirmed and the order is ready for fulfillment.",
        occurredAt: snapshot.paidAt ?? snapshot.updatedAt ?? new Date().toISOString(),
      },
    ]
  }

  return [
    {
      type: snapshot.status,
      title: formatOrderStatus(snapshot.status),
      description: "The order status was updated.",
      occurredAt: snapshot.updatedAt ?? new Date().toISOString(),
    },
  ]
}

function timelineEntriesFromOrder(order: OrderDto | null) {
  const sorted = (order?.statusHistory?.entries ?? []).slice().sort((a, b) => {
    const aTime = a.occurredAt ? new Date(a.occurredAt).getTime() : 0
    const bTime = b.occurredAt ? new Date(b.occurredAt).getTime() : 0
    return aTime - bTime
  })

  const seen = new Set<string>()

  return sorted.filter((entry) => {
    const key = [
      entry.type ?? "",
      entry.title ?? "",
      entry.description ?? "",
      entry.occurredAt ?? "",
    ].join("|")

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function shipmentTimelineEntriesFromOrder(order: OrderDto | null) {
  const entries: Array<{
    key: string
    title: string
    description?: string
    occurredAt?: string | null
  }> = []

  if (!order?.fulfillmentGroupId) return entries

  entries.push({
    key: "shipment-group",
    title: isOpenBoxOrder(order) ? "Added to Open Box" : "Shipment created",
    description: isOpenBoxOrder(order)
      ? "This order is part of your Open Box shipment workflow."
      : "This order is moving through direct fulfillment.",
    occurredAt: order.paidAt ?? order.updatedAt ?? null,
  })

  if (isOpenBoxOrder(order) && order.shipmentRequestStatus && order.shipmentRequestStatus.toUpperCase() !== "NONE") {
    entries.push({
      key: "shipment-request-status",
      title: formatShipmentRequestStatus(order.shipmentRequestStatus),
      description: "Shipping invoice progress for this Open Box shipment.",
      occurredAt: order.updatedAt ?? null,
    })
  }

  if (order.shippingInvoiceId) {
    entries.push({
      key: "shipping-invoice",
      title:
        order.shippingInvoiceStatus?.toUpperCase() === "PAID"
          ? "Shipping invoice paid"
          : "Shipping invoice available",
      description: `Shipping invoice status: ${order.shippingInvoiceStatus ?? "Unknown"}`,
      occurredAt: order.updatedAt ?? null,
    })
  }

  if (order.packedAt) {
    entries.push({
      key: "packed",
      title: "Packed",
      description: "Your order has been packed for shipment.",
      occurredAt: order.packedAt,
    })
  }

  if (order.shippedAt) {
    entries.push({
      key: "shipped",
      title: "Shipped",
      description:
        order.shippingCarrier || order.trackingNumber
          ? `Carrier: ${order.shippingCarrier ?? "—"} • Tracking: ${order.trackingNumber ?? "—"}`
          : "Your order has shipped.",
      occurredAt: order.shippedAt,
    })
  }

  if (order.deliveredAt) {
    entries.push({
      key: "delivered",
      title: "Delivered",
      description: "Your order was marked delivered.",
      occurredAt: order.deliveredAt,
    })
  }

  return entries
}

function listingHref(line: OrderLineDto) {
  if (!line.listingId) return null
  if (line.listingSlug) {
    return `/listing/${line.listingSlug}-${line.listingId}`
  }

  return `/listing/${line.listingId}`
}

export function OrderDetailClient({ orderId }: Props) {
  const router = useRouter()

  const [order, setOrder] = useState<OrderDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<"stripe" | "paypal">("stripe")
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  const [selectedShippingMode, setSelectedShippingMode] = useState<ShippingMode>("UNSELECTED")
  const [isSavingShippingChoice, setIsSavingShippingChoice] = useState(false)
  const [shippingChoiceError, setShippingChoiceError] = useState<string | null>(null)

  const sse = useSse<OrderRealtimeSnapshot>(
    order ? `/api/bff/sse/orders/${encodeURIComponent(orderId)}` : null,
    {
      parseSnapshot: (data) => normalizeSseSnapshot(JSON.parse(data) as unknown),
    },
  )

  useEffect(() => {
    let isMounted = true

    async function loadOrder() {
      setIsLoading(true)
      setError(null)
      setErrorStatus(null)
      setSessionExpired(false)

      try {
        const res = await fetch(`/api/bff/orders/${encodeURIComponent(orderId)}`, {
          cache: "no-store",
        })

        const body = (await res.json().catch(() => null)) as OrderDto | LoadableError | null

        if (!isMounted) return

        if (res.status === 401) {
          setSessionExpired(true)
          setErrorStatus(401)
          setError("Your session expired. Please sign in again.")
          setIsLoading(false)
          return
        }

        if (res.status === 403) {
          setErrorStatus(403)
          setError("You do not have access to this order.")
          setIsLoading(false)
          return
        }

        if (res.status === 404) {
          setErrorStatus(404)
          setError("We couldn’t find this order.")
          setIsLoading(false)
          return
        }

        if (!res.ok || !body || !("id" in body)) {
          setErrorStatus(res.status)
          setError(
            (body && "message" in body && typeof body.message === "string" && body.message) ||
            (body && "error" in body && typeof body.error === "string" && body.error) ||
            "We couldn’t load this order.",
          )
          setIsLoading(false)
          return
        }

        setOrder(body)
        setSelectedShippingMode((body.shippingMode as ShippingMode | undefined) ?? "UNSELECTED")
        setIsLoading(false)
      } catch {
        if (!isMounted) return
        setErrorStatus(500)
        setError("We couldn’t load this order.")
        setIsLoading(false)
      }
    }

    void loadOrder()

    return () => {
      isMounted = false
    }
  }, [orderId])

  const liveOrder = useMemo(() => {
    if (!order) return null

    const snapshot = sse.snapshot
    if (!snapshot) return order

    const incomingEntries =
      snapshot.newTimelineEntries?.length
        ? snapshot.newTimelineEntries
        : deriveSseFallbackTimelineEntry(order, snapshot)

    const nextStatus = snapshot.status ?? order.status
    const shouldApplyRealtimeTotals =
      nextStatus === "READY_TO_FULFILL" || nextStatus === "PAID"

    return {
      ...order,
      orderNumber: snapshot.orderNumber ?? order.orderNumber,
      status: nextStatus,
      paymentStatus: snapshot.paymentStatus ?? order.paymentStatus,
      paymentProvider: snapshot.paymentProvider ?? order.paymentProvider,
      paidAt: snapshot.paidAt ?? order.paidAt,
      paymentDueAt: snapshot.paymentDueAt ?? order.paymentDueAt,
      totalCents: shouldApplyRealtimeTotals ? (snapshot.totalCents ?? order.totalCents) : order.totalCents,
      currencyCode: snapshot.currencyCode ?? order.currencyCode,
      sourceType: snapshot.sourceType ?? order.sourceType,
      auctionId: snapshot.auctionId !== undefined ? snapshot.auctionId : order.auctionId,
      fulfillmentGroupId:
        snapshot.fulfillmentGroupId !== undefined
          ? snapshot.fulfillmentGroupId
          : order.fulfillmentGroupId,
      updatedAt: snapshot.updatedAt ?? order.updatedAt,
      statusHistory: {
        entries: mergeTimelineEntries(order.statusHistory?.entries, incomingEntries),
      },
    }
  }, [order, sse.snapshot])

  async function handleSaveShippingChoice() {
    if (!liveOrder || liveOrder.sourceType !== "AUCTION" || !isAwaitingPayment(liveOrder)) return
    if (selectedShippingMode === "UNSELECTED") {
      setShippingChoiceError("Please choose how you want this auction order shipped before paying.")
      return
    }

    setIsSavingShippingChoice(true)
    setShippingChoiceError(null)
    setPaymentError(null)
    setSessionExpired(false)

    try {
      const res = await fetch(`/api/bff/orders/${encodeURIComponent(orderId)}/auction-shipping-choice`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          shippingMode: selectedShippingMode,
        }),
      })

      const body = (await res.json().catch(() => null)) as
        | AuctionShippingChoiceResponse
        | { message?: string; error?: string }
        | null

      if (res.status === 401) {
        setSessionExpired(true)
        setShippingChoiceError("Your session expired. Please sign in again.")
        setIsSavingShippingChoice(false)
        return
      }

      if (!res.ok || !body || !("shippingMode" in body)) {
        setShippingChoiceError(
          (body && "message" in body && typeof body.message === "string" && body.message) ||
          (body && "error" in body && typeof body.error === "string" && body.error) ||
          "We couldn’t update your shipping choice.",
        )
        setIsSavingShippingChoice(false)
        return
      }

      setOrder((current) =>
        current
          ? {
            ...current,
            shippingMode: body.shippingMode ?? current.shippingMode,
            shippingAmountCents: body.shippingAmountCents ?? current.shippingAmountCents,
            subtotalCents: body.subtotalCents ?? current.subtotalCents,
            discountTotalCents: body.discountTotalCents ?? current.discountTotalCents,
            totalCents: body.totalCents ?? current.totalCents,
            currencyCode: body.currencyCode ?? current.currencyCode,
          }
          : current,
      )

      setSelectedShippingMode((body.shippingMode as ShippingMode | undefined) ?? selectedShippingMode)
      setIsSavingShippingChoice(false)
    } catch {
      setShippingChoiceError("We couldn’t update your shipping choice.")
      setIsSavingShippingChoice(false)
    }
  }

  function isOpenBoxOrder(order: OrderDto | null) {
    return (order?.shippingMode ?? "").toUpperCase() === "OPEN_BOX"
  }

  function isDirectShipOrder(order: OrderDto | null) {
    return (order?.shippingMode ?? "").toUpperCase() === "SHIP_NOW"
  }

  function shipmentStateLabel(order: OrderDto | null) {
    if (isOpenBoxOrder(order)) return "Open Box shipping state"
    if (isDirectShipOrder(order)) return "Shipping invoice state"
    return "Shipment state"
  }

  function shipmentGroupTypeLabel(order: OrderDto | null) {
    if (isOpenBoxOrder(order)) return "Open Box group"
    if (isDirectShipOrder(order)) return "Shipment type"
    return "Shipment group type"
  }

  function shippingInvoiceEmptyLabel(order: OrderDto | null) {
    if (isDirectShipOrder(order)) return "Not needed for Ship Now orders"
    if (isOpenBoxOrder(order)) return "No shipping invoice yet"
    return "No shipping invoice"
  }

  async function handleStartPayment() {
    if (!liveOrder || !isAwaitingPayment(liveOrder) || isSubmittingPayment) return

    if (liveOrder.sourceType === "AUCTION" && (liveOrder.shippingMode ?? "UNSELECTED") === "UNSELECTED") {
      setPaymentError("Choose Ship now or Open Box before starting payment.")
      return
    }

    setIsSubmittingPayment(true)
    setPaymentError(null)
    setSessionExpired(false)

    try {
      const origin = window.location.origin

      const res = await fetch(`/api/bff/orders/${encodeURIComponent(orderId)}/payments/start`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          provider: selectedProvider,
          successUrl: `${origin}/orders/return`,
          cancelUrl: `${origin}/orders/${encodeURIComponent(orderId)}`,
        }),
      })

      const body = (await res.json().catch(() => null)) as
        | StartOrderPaymentResponse
        | { message?: string; error?: string }
        | null

      if (res.status === 401) {
        setSessionExpired(true)
        setPaymentError("Your session expired. Please sign in again.")
        setIsSubmittingPayment(false)
        return
      }

      if (!res.ok || !body || !("redirectUrl" in body)) {
        setPaymentError(
          (body && "message" in body && typeof body.message === "string" && body.message) ||
          (body && "error" in body && typeof body.error === "string" && body.error) ||
          "We couldn’t start payment for this order.",
        )
        setIsSubmittingPayment(false)
        return
      }

      if (!body.redirectUrl) {
        setPaymentError("Payment started, but no redirect URL was returned.")
        setIsSubmittingPayment(false)
        return
      }

      if (!body.orderPaymentId) {
        setPaymentError("Payment started, but no order payment id was returned.")
        setIsSubmittingPayment(false)
        return
      }

      window.sessionStorage.setItem("mk_order_payment_return_payment_id", body.orderPaymentId)

      const redirectUrl = new URL(body.redirectUrl)
      redirectUrl.searchParams.set("paymentId", body.orderPaymentId)

      window.location.assign(redirectUrl.toString())
    } catch {
      setPaymentError("We couldn’t start payment for this order.")
      setIsSubmittingPayment(false)
    }
  }

  function goToLogin() {
    const returnTo = encodeURIComponent(`/orders/${orderId}`)
    router.push(`/login?returnTo=${returnTo}`)
  }

  const effectiveShippingMode: ShippingMode =
    selectedShippingMode !== "UNSELECTED"
      ? selectedShippingMode
      : ((liveOrder?.shippingMode as ShippingMode | undefined) ?? "UNSELECTED")

  const requiresShippingInvoice = liveOrder?.requiresShippingInvoice === true

  const total = formatMoney(liveOrder?.totalCents, liveOrder?.currencyCode)
  const subtotal = formatMoney(liveOrder?.subtotalCents, liveOrder?.currencyCode)
  const discount = formatMoney(liveOrder?.discountTotalCents, liveOrder?.currencyCode)
  const shipping = formatMoney(liveOrder?.shippingAmountCents, liveOrder?.currencyCode)
  const paymentDueAt = formatDateTime(liveOrder?.paymentDueAt)
  const paidAt = formatDateTime(liveOrder?.paidAt)
  const updatedAt = formatDateTime(liveOrder?.updatedAt)
  const paymentStatus = formatPaymentStatus(liveOrder?.paymentStatus)
  const paymentProvider = formatPaymentProvider(liveOrder?.paymentProvider)
  const timelineEntries = useMemo(() => timelineEntriesFromOrder(liveOrder), [liveOrder])
  const shippingChoiceRequired = isAuctionAwaitingShippingChoice(liveOrder)
  const shipmentTimelineEntries = useMemo(
    () => shipmentTimelineEntriesFromOrder(liveOrder),
    [liveOrder],
  )

  if (isLoading) {
    return (
      <section
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        data-testid="order-detail-loading"
      >
        <p className="text-sm text-stone-600">Loading order…</p>
      </section>
    )
  }

  if (error && !liveOrder) {
    return (
      <section
        className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm"
        data-testid="order-detail-error"
      >
        <h1 className="text-xl font-semibold text-red-900">
          {errorStatus === 404 ? "Order not found" : "We couldn’t load this order"}
        </h1>
        <p className="mt-2 text-sm text-red-800">{error}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          {sessionExpired || errorStatus === 401 ? (
            <button
              type="button"
              onClick={goToLogin}
              className="inline-flex rounded-full bg-red-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
              data-testid="order-detail-sign-in-again"
            >
              Sign in again
            </button>
          ) : null}

          {errorStatus === 403 ? (
            <Link
              href="/403"
              className="inline-flex rounded-full bg-red-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
              data-testid="order-detail-go-forbidden"
            >
              View access information
            </Link>
          ) : null}

          <Link
            href="/dashboard"
            className="inline-flex rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 transition hover:bg-red-100"
            data-testid="order-detail-back-dashboard"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section
      className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      data-testid="order-detail-card"
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">Order</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">
              {isAwaitingPayment(liveOrder) ? "Complete payment for your order" : "Order details"}
            </h1>
            <p className="mt-2 text-sm text-stone-600 sm:text-base">
              This page shows backend-confirmed order and payment status and updates live when that
              status changes.
            </p>
          </div>

          <div
            className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700"
            data-testid="order-detail-live-status"
          >
            {sse.connected
              ? "Live updates active"
              : sse.connecting
                ? "Reconnecting to live updates…"
                : sse.error
                  ? "Live updates unavailable"
                  : "Waiting for live updates…"}
          </div>
        </div>

        {sse.error ? (
          <p className="text-xs text-amber-700" data-testid="order-detail-live-status-message">
            Showing the last known order state. You can refresh the page if needed.
          </p>
        ) : null}
      </div>

      <section
        className="grid gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="order-detail-summary"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Order number</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="order-detail-number">
            {liveOrder?.orderNumber ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Status</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="order-detail-status">
            {formatOrderStatus(liveOrder?.status)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Source</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="order-detail-source">
            {liveOrder?.sourceType ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Auction</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="order-detail-auction-id">
            {liveOrder?.auctionId ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Payment due</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="order-detail-payment-due">
            {paymentDueAt ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Paid at</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="order-detail-paid-at">
            {paidAt ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Payment status
          </p>
          <p className="mt-1 text-sm text-stone-900" data-testid="order-detail-payment-status">
            {paymentStatus}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Provider</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="order-detail-payment-provider">
            {paymentProvider}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Last updated</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="order-detail-updated-at">
            {updatedAt ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Shipping mode</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="order-detail-shipping-mode">
            {formatShippingMode(liveOrder?.shippingMode)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Subtotal</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="order-detail-subtotal">
            {subtotal ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Discount</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="order-detail-discount">
            {discount ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Shipping</p>
          <p className="mt-1 text-sm text-stone-900" data-testid="order-detail-shipping">
            {shipping ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Total</p>
          <p className="mt-1 text-sm font-semibold text-stone-900" data-testid="order-detail-total">
            {total ?? "—"}
          </p>
        </div>
      </section>

      {isAwaitingPayment(liveOrder) ? (
        <PaymentContextRow
          testId="order-detail-payment-context"
          imageUrl={buildOrderPaymentImage(liveOrder)}
          imageAlt={buildOrderPaymentTitle(liveOrder)}
          fallbackLabel="Order"
          badge="Order payment"
          title={buildOrderPaymentTitle(liveOrder)}
          context={buildOrderPaymentContext(liveOrder)}
          helper={buildOrderPaymentHelper(liveOrder)}
          amount={formatMoney(liveOrder?.totalCents ?? null, liveOrder?.currencyCode ?? "USD")}
        />
      ) : null}

      {isAwaitingPayment(liveOrder) && liveOrder?.sourceType === "AUCTION" ? (
        <section
          className="rounded-2xl border border-amber-200 bg-amber-50 p-6"
          data-testid="order-detail-auction-shipping-choice-panel"
        >
          <h2 className="text-lg font-semibold text-amber-950">Choose how you want this auction shipped</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Standard auction checkout includes shipping in this payment. If you prefer to combine
            shipping later, choose Open Box and shipping will be billed later by shipping invoice.
          </p>

          <fieldset className="mt-4 space-y-3">
            <legend className="block text-sm font-medium text-amber-950">Shipping choice</legend>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-white p-4 text-sm text-amber-950">
              <input
                type="radio"
                name="auction-shipping-mode"
                value="SHIP_NOW"
                checked={effectiveShippingMode === "SHIP_NOW"}
                onChange={() => setSelectedShippingMode("SHIP_NOW")}
                data-testid="order-detail-shipping-mode-ship-now"
              />
              <span>
                <span className="block font-semibold">Ship now</span>
                <span className="mt-1 block text-amber-800">
                  Pay your auction total including shipping in one transaction now.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-white p-4 text-sm text-amber-950">
              <input
                type="radio"
                name="auction-shipping-mode"
                value="OPEN_BOX"
                checked={effectiveShippingMode === "OPEN_BOX"}
                onChange={() => setSelectedShippingMode("OPEN_BOX")}
                data-testid="order-detail-shipping-mode-open-box"
              />
              <span>
                <span className="block font-semibold">Keep in Open Box</span>
                <span className="mt-1 block text-amber-800">
                  Pay for this item now and pay shipping later when your Open Box shipment is ready.
                </span>
              </span>
            </label>
          </fieldset>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSaveShippingChoice}
              disabled={isSavingShippingChoice}
              className="inline-flex rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="order-detail-save-shipping-choice"
            >
              {isSavingShippingChoice ? "Saving choice..." : "Update total"}
            </button>
          </div>

          {shippingChoiceRequired ? (
            <p
              className="mt-4 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900"
              data-testid="order-detail-shipping-choice-required"
            >
              Choose Ship now or Open Box before starting payment.
            </p>
          ) : null}

          {effectiveShippingMode === "OPEN_BOX" ? (
            <p
              className="mt-4 text-sm text-amber-900"
              data-testid="order-detail-open-box-note"
            >
              Open Box means you are paying for this auction item now. Shipping will be billed
              later through a separate shipping invoice when your Open Box shipment is closed.
            </p>
          ) : null}

          {shippingChoiceError ? (
            <div
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              data-testid="order-detail-shipping-choice-error"
            >
              {shippingChoiceError}
            </div>
          ) : null}
        </section>
      ) : null}

      {isAwaitingProviderConfirmation(liveOrder) ? (
        <PaymentStatusPanel
          testId="order-detail-payment-awaiting-confirmation"
          tone="info"
          title="Waiting for payment confirmation"
          body="Your order payment has been started, but it is not final until we confirm it from the payment provider. This page will update automatically when confirmation arrives."
          actions={[
            { label: "Back to dashboard", href: "/dashboard", variant: "secondary" },
          ]}
        />
      ) : null}

      {isAwaitingPayment(liveOrder) ? (
        <section
          className="rounded-2xl border border-blue-200 bg-blue-50 p-6"
          data-testid="order-detail-payment-panel"
        >
          <h2 className="text-lg font-semibold text-blue-950">Payment is due</h2>
          <p className="mt-2 text-sm leading-6 text-blue-900">
            Choose a payment provider to complete this order. Payment is only considered complete
            when the backend confirms it.
          </p>

          <fieldset className="mt-4 space-y-2">
            <legend className="block text-sm font-medium text-blue-950">Payment provider</legend>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-blue-950">
                <input
                  type="radio"
                  name="order-payment-provider"
                  value="stripe"
                  checked={selectedProvider === "stripe"}
                  onChange={() => setSelectedProvider("stripe")}
                  data-testid="order-detail-provider-stripe"
                />
                Stripe
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-blue-950">
                <input
                  type="radio"
                  name="order-payment-provider"
                  value="paypal"
                  checked={selectedProvider === "paypal"}
                  onChange={() => setSelectedProvider("paypal")}
                  data-testid="order-detail-provider-paypal"
                />
                PayPal / Venmo
              </label>
            </div>
          </fieldset>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleStartPayment}
              disabled={isSubmittingPayment || shippingChoiceRequired}
              className="inline-flex rounded-full bg-blue-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="order-detail-start-payment"
            >
              {isSubmittingPayment ? "Starting payment..." : "Pay now"}
            </button>

            {liveOrder?.auctionId ? (
              <Link
                href={`/auctions/${liveOrder.auctionId}`}
                className="inline-flex rounded-full border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-950 transition hover:bg-blue-100"
                data-testid="order-detail-back-to-auction"
              >
                Back to auction
              </Link>
            ) : null}
          </div>

          {paymentError ? (
            <div className="mt-4">
              <PaymentStatusPanel
                testId="order-detail-payment-error"
                tone="error"
                title="We couldn’t start payment"
                body={paymentError}
                actions={[
                  { label: "Back to dashboard", href: "/dashboard", variant: "secondary" },
                ]}
              />
            </div>
          ) : null}

          {sessionExpired ? (
            <button
              type="button"
              onClick={goToLogin}
              className="mt-4 inline-flex rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
              data-testid="order-detail-payment-sign-in-again"
            >
              Sign in again
            </button>
          ) : null}
        </section>
      ) : null}

      {isPaidOrder(liveOrder) ? (
        <>
          <PaymentStatusPanel
            testId="order-detail-payment-confirmed"
            tone="success"
            title="Order payment confirmed"
            body="We’ve confirmed payment for this order. You can continue tracking it from your order details and dashboard."
            actions={[
              { label: "Back to dashboard", href: "/dashboard", variant: "secondary" },
            ]}
          />

          <section
            className="rounded-2xl border border-green-200 bg-green-50 p-6"
            data-testid="order-detail-paid-state"
          >
            <h2 className="text-lg font-semibold text-green-900">Payment complete</h2>
            <p className="mt-2 text-sm leading-6 text-green-800">
              {isOpenBoxOrder(liveOrder)
                ? "Payment has been confirmed. This order is now part of your Open Box shipment workflow."
                : "Payment has been confirmed and this order is moving through direct fulfillment."}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {liveOrder?.auctionId ? (
                <Link
                  href={`/auctions/${liveOrder.auctionId}`}
                  className="inline-flex rounded-full border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-900 transition hover:bg-green-100"
                  data-testid="order-detail-paid-back-to-auction"
                >
                  Back to auction
                </Link>
              ) : null}

              <Link
                href="/dashboard"
                className="inline-flex rounded-full bg-green-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800"
                data-testid="order-detail-paid-go-dashboard"
              >
                Go to dashboard
              </Link>
            </div>
          </section>
        </>
      ) : null}
      {liveOrder?.fulfillmentGroupId ? (
        <section
          className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
          data-testid="order-detail-shipment-progress"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-stone-900">Shipment progress</h2>
            <p className="text-xs text-stone-500">
              Fulfillment group {liveOrder.fulfillmentGroupId}
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Fulfillment status
              </p>
              <p className="mt-1 text-sm text-stone-900">
                {formatFulfillmentStatus(liveOrder.fulfillmentStatus)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {shipmentStateLabel(liveOrder)}
              </p>
              <p className="mt-1 text-sm text-stone-900">
                {formatShipmentRequestStatus(liveOrder.shipmentRequestStatus)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {shipmentGroupTypeLabel(liveOrder)}
              </p>
              <p className="mt-1 text-sm text-stone-900">
                {formatBoxStatus(liveOrder.boxStatus)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Packed at
              </p>
              <p className="mt-1 text-sm text-stone-900">
                {formatDateTime(liveOrder.packedAt) ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Shipped at
              </p>
              <p className="mt-1 text-sm text-stone-900">
                {formatDateTime(liveOrder.shippedAt) ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Delivered at
              </p>
              <p className="mt-1 text-sm text-stone-900">
                {formatDateTime(liveOrder.deliveredAt) ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Carrier
              </p>
              <p className="mt-1 text-sm text-stone-900">
                {liveOrder.shippingCarrier ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Tracking number
              </p>
              <p className="mt-1 break-all text-sm text-stone-900">
                {liveOrder.trackingNumber ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Shipping invoice
              </p>
              {requiresShippingInvoice && liveOrder.shippingInvoiceId ? (
                <Link
                  href={`/shipping-invoices/${encodeURIComponent(liveOrder.shippingInvoiceId)}`}
                  className="mt-1 inline-flex text-sm text-stone-900 underline underline-offset-4 hover:text-stone-700"
                  data-testid="order-detail-shipping-invoice-link"
                >
                  View invoice ({liveOrder.shippingInvoiceStatus ?? "Unknown"})
                </Link>
              ) : (
                <p
                  className="mt-1 text-sm text-stone-900"
                  data-testid="order-detail-shipping-invoice-none"
                >
                  {shippingInvoiceEmptyLabel(liveOrder)}
                </p>
              )}
            </div>
          </div>

          {shipmentTimelineEntries.length ? (
            <ol className="mt-6 space-y-4">
              {shipmentTimelineEntries.map((entry) => (
                <li
                  key={entry.key}
                  className="border-l-2 border-stone-200 pl-4"
                  data-testid="order-detail-shipment-timeline-entry"
                >
                  <p className="text-sm font-semibold text-stone-900">{entry.title}</p>
                  {entry.description ? (
                    <p className="mt-1 text-sm text-stone-600">{entry.description}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-stone-500">
                    {formatDateTime(entry.occurredAt) ?? "—"}
                  </p>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ) : null}
      <section
        className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
        data-testid="order-detail-lines"
      >
        <h2 className="text-lg font-semibold text-stone-900">Line items</h2>
        {liveOrder?.lines?.length ? (
          <ul className="mt-3 space-y-3">
            {liveOrder.lines.map((line) => {
              const href = listingHref(line)
              const lineTotal = formatMoney(line.lineTotalCents, liveOrder.currencyCode)
              const unitFinal = formatMoney(line.unitFinalPriceCents, liveOrder.currencyCode)

              return (
                <li
                  key={line.id ?? `${line.listingId}-${line.quantity}`}
                  className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-700"
                >
                  <div className="flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                      {line.primaryImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={line.primaryImageUrl}
                          alt={line.title ?? "Order line item"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-stone-500">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {href ? (
                        <Link
                          href={href}
                          className="text-base font-semibold text-stone-900 hover:underline"
                          data-testid="order-detail-line-link"
                        >
                          {line.title ?? "Listing"}
                        </Link>
                      ) : (
                        <p className="text-base font-semibold text-stone-900">
                          {line.title ?? "Listing"}
                        </p>
                      )}

                      {line.mineralName || line.locality ? (
                        <p className="mt-1 text-sm text-stone-600">
                          {[line.mineralName, line.locality].filter(Boolean).join(" • ")}
                        </p>
                      ) : null}

                      <dl className="mt-3 grid gap-2 text-sm text-stone-700 sm:grid-cols-3">
                        <div>
                          <dt className="font-medium text-stone-500">Quantity</dt>
                          <dd>{line.quantity ?? 0}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-stone-500">Unit price</dt>
                          <dd>{unitFinal ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-stone-500">Line total</dt>
                          <dd>{lineTotal ?? "—"}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-stone-600">No line items are available for this order yet.</p>
        )}
      </section>

      <section
        className="rounded-2xl border border-stone-200 bg-white p-4"
        data-testid="order-detail-timeline"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-900">Order history</h2>
          {updatedAt ? <p className="text-xs text-stone-500">Last updated {updatedAt}</p> : null}
        </div>

        {timelineEntries.length ? (
          <ol className="mt-4 space-y-4">
            {timelineEntries.map((entry, index) => (
              <li
                key={`${entry.type ?? "entry"}-${entry.occurredAt ?? index}-${entry.title ?? ""}-${entry.description ?? ""}-${index}`}
                className="border-l-2 border-stone-200 pl-4"
                data-testid="order-detail-timeline-entry"
              >
                <p className="text-sm font-semibold text-stone-900">
                  {entry.title ?? formatOrderStatus(entry.type)}
                </p>
                {entry.description ? (
                  <p className="mt-1 text-sm text-stone-600">{entry.description}</p>
                ) : null}
                <p className="mt-1 text-xs text-stone-500">
                  {formatDateTime(entry.occurredAt) ?? "—"}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-stone-600">
            Order history is not available yet for this order.
          </p>
        )}
      </section>

      <section
        className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
        data-testid="order-detail-support"
      >
        <h2 className="text-lg font-semibold text-stone-900">Need help?</h2>
        <p className="mt-2 text-sm text-stone-600">
          If something looks wrong with this order or payment state, contact support and include
          your order number.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
            data-testid="order-detail-support-dashboard"
          >
            Back to dashboard
          </Link>
          <Link
            href="/support"
            className="inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
            data-testid="order-detail-support-link"
          >
            Contact support
          </Link>
        </div>
      </section>
    </section>
  )
}
