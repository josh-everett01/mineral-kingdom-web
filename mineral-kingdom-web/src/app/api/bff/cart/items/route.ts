import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"
const CART_COOKIE_NAME = "mk_cart_id"

async function buildHeaders(): Promise<Headers> {
  const cookieStore = await cookies()
  const headers = new Headers({
    "content-type": "application/json",
  })

  const cartId = cookieStore.get(CART_COOKIE_NAME)?.value
  if (cartId) {
    headers.set("X-Cart-Id", cartId)
  }

  return headers
}

function buildCartRedirect(req: Request) {
  return NextResponse.redirect(new URL("/cart", req.url), { status: 303 })
}

export async function POST(req: Request) {
  const formData = await req.formData()

  const offerId = String(formData.get("offerId") ?? "").trim()
  const quantityRaw = String(formData.get("quantity") ?? "1").trim()
  const quantity = Number.parseInt(quantityRaw, 10)

  if (!offerId || !Number.isFinite(quantity) || quantity <= 0) {
    return buildCartRedirect(req)
  }

  let upstream: Response
  try {
    upstream = await fetch(`${API_BASE_URL}/api/cart/lines`, {
      method: "PUT",
      headers: await buildHeaders(),
      body: JSON.stringify({
        offerId,
        quantity,
      }),
      cache: "no-store",
    })
  } catch {
    return buildCartRedirect(req)
  }

  const response = buildCartRedirect(req)

  const cartId = upstream.headers.get("X-Cart-Id")
  if (cartId) {
    response.cookies.set(CART_COOKIE_NAME, cartId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
  }

  return response
}