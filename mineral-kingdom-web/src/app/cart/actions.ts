"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"
const CART_COOKIE_NAME = "mk_cart_id"

export async function removeCartLineAction(formData: FormData) {
  const offerId = String(formData.get("offerId") ?? "").trim()
  if (!offerId) {
    return
  }

  const cookieStore = await cookies()
  const cartId = cookieStore.get(CART_COOKIE_NAME)?.value

  const headers = new Headers()
  if (cartId) {
    headers.set("X-Cart-Id", cartId)
  }

  const res = await fetch(`${API_BASE_URL}/api/cart/lines/${encodeURIComponent(offerId)}`, {
    method: "DELETE",
    headers,
    cache: "no-store",
  })

  const returnedCartId = res.headers.get("X-Cart-Id")
  if (returnedCartId) {
    cookieStore.set(CART_COOKIE_NAME, returnedCartId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
  }

  revalidatePath("/cart")
}