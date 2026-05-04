import { cookies } from "next/headers"

import { startCheckoutAction } from "@/app/checkout/actions"
import { CheckoutStartClient } from "@/components/checkout/CheckoutStartClient"

type Props = {
  searchParams: Promise<{
    cartId?: string
    holdId?: string
    expiresAt?: string
    error?: string
  }>
}

export default async function CheckoutPage({ searchParams }: Props) {
  const cookieStore = await cookies()
  const { cartId, holdId, expiresAt, error } = await searchParams

  const hasAuthCookie =
    Boolean(cookieStore.get("mk_access")?.value) ||
    Boolean(cookieStore.get("__Secure-mk_access")?.value)

  const initialCheckout =
    cartId && holdId && expiresAt
      ? {
        cartId,
        holdId,
        expiresAt,
      }
      : null

  return (
    <main className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl">
        <form id="checkout-start-form" action={startCheckoutAction}>
          <CheckoutStartClient
            isAuthenticated={hasAuthCookie}
            initialEmail={null}
            initialCheckout={initialCheckout}
            initialError={error ?? null}
          />
        </form>
      </div>
    </main>
  )
}