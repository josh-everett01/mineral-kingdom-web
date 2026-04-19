import type {
  AdminCreateShippingInvoiceResult,
  AdminFulfillmentGroupDetail,
  AdminFulfillmentListItem,
} from "@/lib/admin/fulfillment/types"

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`

    try {
      const body = (await res.json()) as {
        message?: string
        details?: { error?: string }
        error?: string
      }

      message = body.details?.error ?? body.error ?? body.message ?? message
    } catch {
      // ignore
    }

    throw new Error(message)
  }

  return (await res.json()) as T
}

export async function fetchAdminFulfillmentGroups(): Promise<AdminFulfillmentListItem[]> {
  const res = await fetch("/api/bff/admin/fulfillment/open-boxes", {
    method: "GET",
    cache: "no-store",
  })

  return readJson<AdminFulfillmentListItem[]>(res)
}

export async function fetchAdminFulfillmentGroupDetail(
  groupId: string,
): Promise<AdminFulfillmentGroupDetail> {
  const res = await fetch(`/api/bff/admin/fulfillment/${groupId}`, {
    method: "GET",
    cache: "no-store",
  })

  return readJson<AdminFulfillmentGroupDetail>(res)
}

export async function createAdminShippingInvoice(
  groupId: string,
  payload?: { amountCents?: number; reason?: string | null },
): Promise<AdminCreateShippingInvoiceResult> {
  const res = await fetch(`/api/bff/admin/fulfillment/${groupId}/shipping-invoice`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload ?? {}),
  })

  return readJson<AdminCreateShippingInvoiceResult>(res)
}

export async function markAdminOrderPacked(orderId: string): Promise<void> {
  const res = await fetch(`/api/bff/admin/orders/${orderId}/fulfillment/packed`, {
    method: "POST",
    cache: "no-store",
  })

  if (!res.ok) {
    await readJson<never>(res)
  }
}

export async function markAdminOrderShipped(
  orderId: string,
  payload: { shippingCarrier: string; trackingNumber: string },
): Promise<void> {
  const res = await fetch(`/api/bff/admin/orders/${orderId}/fulfillment/shipped`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    await readJson<never>(res)
  }
}

export async function markAdminGroupPacked(groupId: string): Promise<void> {
  const res = await fetch(`/api/bff/admin/fulfillment/${groupId}/packed`, {
    method: "POST",
    cache: "no-store",
  })

  if (!res.ok) {
    await readJson<never>(res)
  }
}

export async function markAdminGroupShipped(
  groupId: string,
  payload: { shippingCarrier: string; trackingNumber: string },
): Promise<void> {
  const res = await fetch(`/api/bff/admin/fulfillment/${groupId}/shipped`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    await readJson<never>(res)
  }
}

export async function markAdminGroupDelivered(groupId: string): Promise<void> {
  const res = await fetch(`/api/bff/admin/fulfillment/${groupId}/delivered`, {
    method: "POST",
    cache: "no-store",
  })

  if (!res.ok) {
    await readJson<never>(res)
  }
}

export async function markAdminOrderDelivered(orderId: string): Promise<void> {
  const res = await fetch(`/api/bff/admin/orders/${orderId}/fulfillment/delivered`, {
    method: "POST",
    cache: "no-store",
  })

  if (!res.ok) {
    await readJson<never>(res)
  }
}