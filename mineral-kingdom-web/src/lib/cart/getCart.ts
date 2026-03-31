import { cookies, headers } from "next/headers"
import type { CartDto } from "@/lib/cart/cartTypes"

const CART_COOKIE_NAME = "mk_cart_id"

async function getAppOriginAndCookieHeader(): Promise<{ origin: string; cookieHeader: string | null }> {
  const h = await headers()

  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http")

  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    "localhost:3000"

  const cookieHeader = h.get("cookie")

  return {
    origin: `${proto}://${host}`,
    cookieHeader,
  }
}

export async function fetchCart(): Promise<CartDto | null> {
  const cookieStore = await cookies()
  const existingCartId = cookieStore.get(CART_COOKIE_NAME)?.value ?? null

  // Do not create/bootstrap a brand-new cart from a server-to-server fetch.
  // If the browser does not already have a persisted cart cookie, let the
  // browser-side cart flow establish it through the BFF response directly.
  if (!existingCartId) {
    return null
  }

  const { origin, cookieHeader } = await getAppOriginAndCookieHeader()

  const res = await fetch(`${origin}/api/bff/cart`, {
    cache: "no-store",
    headers: cookieHeader
      ? {
        cookie: cookieHeader,
      }
      : undefined,
  })

  if (!res.ok) {
    return null
  }

  return (await res.json()) as CartDto
}