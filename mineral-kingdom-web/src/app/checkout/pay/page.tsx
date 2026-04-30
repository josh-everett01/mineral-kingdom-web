import { cookies } from "next/headers"

import { CheckoutPayClient } from "@/components/checkout/CheckoutPayClient"
import { fetchCart } from "@/lib/cart/getCart"

type Props = {
  searchParams: Promise<{
    holdId?: string
  }>
}

export default async function CheckoutPayPage({ searchParams }: Props) {
  const { holdId } = await searchParams
  const cookieStore = await cookies()

  const accessCookie = cookieStore.get("mk_access")
  const secureAccessCookie = cookieStore.get("__Secure-mk_access")

  const hasAuthCookie = Boolean(accessCookie?.value) || Boolean(secureAccessCookie?.value)

  const initialCart = await fetchCart()

  return (
    <main
      className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
      data-testid="checkout-pay-page"
    >
      <div className="mx-auto max-w-5xl">
        <CheckoutPayClient
          initialHoldId={holdId ?? null}
          isAuthenticated={hasAuthCookie}
          initialCart={initialCart}
        />
      </div>
    </main>
  )
}