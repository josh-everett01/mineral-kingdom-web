import { NextResponse } from "next/server"
import { apiLogout } from "@/lib/auth/api"
import { getRefreshToken, clearAuthCookies } from "@/lib/auth/cookies"
import { clearCartId } from "@/lib/cart/cartCookie"

export async function POST() {
  const rt = await getRefreshToken()

  try {
    if (rt) await apiLogout(rt)
  } finally {
    await clearAuthCookies()
    // Clear the cart cookie on logout so a subsequent user on the same
    // browser does not inherit the previous session's cart. This prevents
    // both the cross-session cart leak and the stale SSE stream subscription
    // that would otherwise subscribe to the wrong cart ID.
    await clearCartId()
  }

  return NextResponse.json({ ok: true })
}