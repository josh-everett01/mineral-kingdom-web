"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useSse } from "@/lib/sse/useSse"
import type { FulfillmentSnapshotDto } from "@/lib/fulfillment/types"

type Props = {
  groupId: string
}

type TimelineStepKey = "PACKED" | "SHIPPED" | "DELIVERED"

type TimelineStep = {
  key: TimelineStepKey
  title: string
  description: string
  timestamp: string | null
  state: "complete" | "current" | "upcoming"
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

function normalizeStatus(value?: string | null) {
  return (value ?? "").trim().toUpperCase()
}

function displayStatus(value?: string | null) {
  const status = normalizeStatus(value)

  switch (status) {
    case "PACKED":
      return "PACKED"
    case "SHIPPED":
      return "SHIPPED"
    case "DELIVERED":
      return "DELIVERED"
    case "READY_TO_FULFILL":
      return "PACKED"
    case "FULFILLING":
      return "PACKED"
    default:
      return "PENDING"
  }
}

function parseSnapshot(payload: unknown): FulfillmentSnapshotDto {
  const source = (payload ?? {}) as Record<string, unknown>

  return {
    fulfillmentGroupId:
      typeof source.FulfillmentGroupId === "string"
        ? source.FulfillmentGroupId
        : typeof source.fulfillmentGroupId === "string"
          ? source.fulfillmentGroupId
          : "",
    status:
      typeof source.Status === "string"
        ? source.Status
        : typeof source.status === "string"
          ? source.status
          : null,
    carrier:
      typeof source.Carrier === "string"
        ? source.Carrier
        : typeof source.carrier === "string"
          ? source.carrier
          : null,
    trackingNumber:
      typeof source.TrackingNumber === "string"
        ? source.TrackingNumber
        : typeof source.trackingNumber === "string"
          ? source.trackingNumber
          : null,
    trackingUrl:
      typeof source.TrackingUrl === "string"
        ? source.TrackingUrl
        : typeof source.trackingUrl === "string"
          ? source.trackingUrl
          : null,
    packedAt:
      typeof source.PackedAt === "string"
        ? source.PackedAt
        : typeof source.packedAt === "string"
          ? source.packedAt
          : null,
    shippedAt:
      typeof source.ShippedAt === "string"
        ? source.ShippedAt
        : typeof source.shippedAt === "string"
          ? source.shippedAt
          : null,
    deliveredAt:
      typeof source.DeliveredAt === "string"
        ? source.DeliveredAt
        : typeof source.deliveredAt === "string"
          ? source.deliveredAt
          : null,
    updatedAt:
      typeof source.UpdatedAt === "string"
        ? source.UpdatedAt
        : typeof source.updatedAt === "string"
          ? source.updatedAt
          : null,
  }
}

function buildTimeline(snapshot: FulfillmentSnapshotDto | null): TimelineStep[] {
  const status = displayStatus(snapshot?.status)

  const currentIndex =
    status === "DELIVERED" ? 2 : status === "SHIPPED" ? 1 : status === "PACKED" ? 0 : -1

  const steps: Array<Omit<TimelineStep, "state"> & { index: number }> = [
    {
      index: 0,
      key: "PACKED",
      title: "Packed",
      description: "Your items have been packed and are being prepared for shipment.",
      timestamp: formatDateTime(snapshot?.packedAt),
    },
    {
      index: 1,
      key: "SHIPPED",
      title: "Shipped",
      description: "Your shipment has gone out and tracking details may now be available.",
      timestamp: formatDateTime(snapshot?.shippedAt),
    },
    {
      index: 2,
      key: "DELIVERED",
      title: "Delivered",
      description: "Your shipment has been marked as delivered.",
      timestamp: formatDateTime(snapshot?.deliveredAt),
    },
  ]

  return steps.map((step) => ({
    key: step.key,
    title: step.title,
    description: step.description,
    timestamp: step.timestamp,
    state:
      currentIndex < 0
        ? "upcoming"
        : step.index < currentIndex
          ? "complete"
          : step.index === currentIndex
            ? "current"
            : "upcoming",
  }))
}

function stepClasses(state: TimelineStep["state"]) {
  switch (state) {
    case "complete":
      return {
        dot: "bg-green-600",
        border: "border-green-200",
        bg: "bg-green-50",
        text: "text-green-950",
      }
    case "current":
      return {
        dot: "bg-blue-600",
        border: "border-blue-200",
        bg: "bg-blue-50",
        text: "text-blue-950",
      }
    default:
      return {
        dot: "bg-stone-300",
        border: "border-stone-200",
        bg: "bg-stone-50",
        text: "text-stone-900",
      }
  }
}

export function FulfillmentTrackingClient({ groupId }: Props) {
  const sse = useSse<FulfillmentSnapshotDto>(
    `/api/bff/sse/fulfillment-groups/${encodeURIComponent(groupId)}`,
    {
      parseSnapshot: (data) => parseSnapshot(JSON.parse(data) as unknown),
    },
  )

  const snapshot = sse.snapshot ?? null
  const timeline = useMemo(() => buildTimeline(snapshot), [snapshot])
  const currentStatus = displayStatus(snapshot?.status)

  return (
    <section
      className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      data-testid="fulfillment-page"
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Fulfillment tracking
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">
              Track your shipment
            </h1>
            <p className="mt-2 text-sm text-stone-600 sm:text-base">
              This page updates in real time as your shipment moves through packing, shipping, and delivery.
            </p>
          </div>

          <div
            className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700"
            data-testid="fulfillment-live-status"
          >
            {sse.connected
              ? "Live updates active"
              : sse.connecting
                ? "Connecting to live updates…"
                : sse.error
                  ? "Live updates unavailable"
                  : "Waiting for live updates…"}
          </div>
        </div>

        {sse.error ? (
          <p className="text-xs text-amber-700" data-testid="fulfillment-live-status-message">
            Showing the last known shipment state. You can refresh the page if needed.
          </p>
        ) : null}
      </div>

      <section
        className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
        data-testid="fulfillment-status-card"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Current status</p>
        <p className="mt-2 text-xl font-semibold text-stone-900" data-testid="fulfillment-status">
          {currentStatus}
        </p>
        <p className="mt-2 text-sm text-stone-600">
          {currentStatus === "PACKED"
            ? "Your shipment has been packed and is waiting to go out."
            : currentStatus === "SHIPPED"
              ? "Your shipment is on the way."
              : currentStatus === "DELIVERED"
                ? "Your shipment has been delivered."
                : "Waiting for shipment updates to arrive."}
        </p>
      </section>

      <section
        className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
        data-testid="fulfillment-timeline"
      >
        <h2 className="text-lg font-semibold text-stone-900">Shipment timeline</h2>

        <ol className="mt-4 space-y-4">
          {timeline.map((step) => {
            const classes = stepClasses(step.state)

            return (
              <li
                key={step.key}
                className={`rounded-2xl border p-4 ${classes.border} ${classes.bg}`}
                data-testid="fulfillment-timeline-step"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-3 w-3 shrink-0 rounded-full ${classes.dot}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${classes.text}`}>{step.title}</p>
                    <p className="mt-1 text-sm text-stone-600">{step.description}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {step.timestamp ?? "Not available yet"}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <section
        className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
        data-testid="fulfillment-shipment-info"
      >
        <h2 className="text-lg font-semibold text-stone-900">Shipment details</h2>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Carrier</dt>
            <dd className="mt-1 text-sm text-stone-900" data-testid="fulfillment-carrier">
              {snapshot?.carrier ?? "Not assigned yet"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Tracking number
            </dt>
            <dd className="mt-1 text-sm text-stone-900" data-testid="fulfillment-tracking-number">
              {snapshot?.trackingNumber ?? "Not available yet"}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Tracking link
          </p>
          {snapshot?.trackingUrl ? (
            <a
              href={snapshot.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex text-sm font-medium text-stone-900 underline-offset-4 hover:underline"
              data-testid="fulfillment-tracking-link"
            >
              Open tracking page
            </a>
          ) : (
            <p className="mt-1 text-sm text-stone-600" data-testid="fulfillment-no-tracking-link">
              A tracking link is not available yet.
            </p>
          )}
        </div>
      </section>

      <section
        className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
        data-testid="fulfillment-support"
      >
        <h2 className="text-lg font-semibold text-stone-900">Need help?</h2>
        <p className="mt-2 text-sm text-stone-600">
          If something looks wrong with your shipment status or tracking details, contact support.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
            data-testid="fulfillment-support-dashboard"
          >
            Back to dashboard
          </Link>
          <Link
            href="/support/new?category=SHIPPING_HELP"
            className="inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
            data-testid="fulfillment-support-link"
          >
            Contact support
          </Link>
        </div>
      </section>
    </section>
  )
}