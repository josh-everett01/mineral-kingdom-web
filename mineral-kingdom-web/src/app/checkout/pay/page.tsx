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

  const hasAuthCookie =
    Boolean(accessCookie?.value) ||
    Boolean(secureAccessCookie?.value)

  const initialCart = await fetchCart()

  return (
    <main
      className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8"
      data-testid="checkout-pay-page"
    >
      <div data-testid="checkout-pay-auth-debug">
        Auth cookie present: {hasAuthCookie ? "yes" : "no"}
      </div>

      <CheckoutPayClient
        initialHoldId={holdId ?? null}
        isAuthenticated={hasAuthCookie}
        initialCart={initialCart}
      />
    </main>
  )
}