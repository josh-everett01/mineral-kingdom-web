import { headers } from "next/headers"
import type { CartDto } from "@/lib/cart/cartTypes"

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