export type AdminExtendPaymentDueRequest = {
  paymentDueAt: string
}

export type AdminExtendPaymentDueResponse = {
  paymentDueAt?: string | null
}

async function readJsonSafe<T>(res: Response): Promise<T> {
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

  try {
    return (await res.json()) as T
  } catch {
    return {} as T
  }
}

export async function extendAdminOrderPaymentDue(
  orderId: string,
  payload: AdminExtendPaymentDueRequest,
): Promise<AdminExtendPaymentDueResponse> {
  const res = await fetch(`/api/bff/admin/orders/${orderId}/payment-due`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  return readJsonSafe<AdminExtendPaymentDueResponse>(res)
}