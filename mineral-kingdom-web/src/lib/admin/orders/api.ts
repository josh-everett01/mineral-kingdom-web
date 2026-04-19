import type {
  AdminOrderDetail,
  AdminOrdersResponse,
  CreateAdminRefundRequest,
} from "@/lib/admin/orders/types"

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Request failed."
    try {
      const body = await response.json()
      message = body?.message ?? body?.error ?? message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export async function getAdminOrders(params?: {
  status?: string
  q?: string
}): Promise<AdminOrdersResponse> {
  const search = new URLSearchParams()

  if (params?.status?.trim()) {
    search.set("status", params.status.trim())
  }

  if (params?.q?.trim()) {
    search.set("q", params.q.trim())
  }

  const url = search.size > 0
    ? `/api/bff/admin/orders?${search.toString()}`
    : "/api/bff/admin/orders"

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<AdminOrdersResponse>(response)
}

export async function getAdminOrder(id: string): Promise<AdminOrderDetail> {
  const response = await fetch(`/api/bff/admin/orders/${id}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<AdminOrderDetail>(response)
}

export async function updateAdminOrderPaymentDue(
  orderId: string,
  paymentDueAt: string,
): Promise<void> {
  const res = await fetch(`/api/bff/admin/orders/${orderId}/payment-due`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ paymentDueAt }),
  })

  if (!res.ok) {
    let message = `Request failed (${res.status})`

    try {
      const body = (await res.json()) as {
        message?: string
        details?: { error?: string }
      }
      message = body.details?.error ?? body.message ?? message
    } catch {
      // ignore
    }

    throw new Error(message)
  }
}

export async function createAdminRefund(
  id: string,
  request: CreateAdminRefundRequest,
): Promise<void> {
  const response = await fetch(`/api/bff/admin/orders/${id}/refunds`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    let message = "Refund failed."
    try {
      const body = await response.json()
      message = body?.message ?? body?.error ?? message
    } catch {
      // ignore
    }
    throw new Error(message)
  }
}