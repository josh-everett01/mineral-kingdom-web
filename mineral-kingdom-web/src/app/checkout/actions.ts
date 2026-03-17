"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"
const CART_COOKIE_NAME = "mk_cart_id"

function buildCheckoutUrl(params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value)
    }
  }

  const query = search.toString()
  return query ? `/checkout?${query}` : "/checkout"
}

function mapCheckoutStartError(message?: string | null) {
  switch (message) {
    case "EMAIL_MISMATCH":
      return "This checkout is already associated with another email. Choose “Not my email?” to start over."
    case "EMAIL_REQUIRED":
      return "Email is required for guest checkout."
    default:
      return message ?? "We couldn't start checkout right now."
  }
}

export async function startCheckoutAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()

  if (!email) {
    redirect(buildCheckoutUrl({ error: "Email is required for guest checkout." }))
  }

  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE_NAME)?.value

  const headers = new Headers({
    "content-type": "application/json",
  })

  if (cartId) {
    headers.set("X-Cart-Id", cartId)
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}/api/checkout/start`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
      }),
      cache: "no-store",
    })
  } catch {
    redirect(buildCheckoutUrl({ error: "We couldn't start checkout right now." }))
  }

  const returnedCartId = res.headers.get("X-Cart-Id")
  if (returnedCartId) {
    cookieStore.set(CART_COOKIE_NAME, returnedCartId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null

    redirect(
      buildCheckoutUrl({
        error: mapCheckoutStartError(body?.message ?? body?.error ?? null),
      }),
    )
  }

  const data = (await res.json()) as {
    cartId: string
    holdId: string
    expiresAt: string
  }

  redirect(
    buildCheckoutUrl({
      cartId: data.cartId,
      holdId: data.holdId,
      expiresAt: data.expiresAt,
    }),
  )
}