import { Suspense } from "react"
import { CheckoutReturnClient } from "@/components/checkout/CheckoutReturnClient"

function CheckoutReturnFallback() {
  return (
    <section
      className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      data-testid="checkout-return-page"
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
        Checkout Return
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-stone-900">
        We recorded your return from the payment provider
      </h1>
      <p className="text-sm text-stone-600 sm:text-base">
        We are restoring your checkout return state now.
      </p>
    </section>
  )
}

export default function CheckoutReturnPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Suspense fallback={<CheckoutReturnFallback />}>
        <CheckoutReturnClient />
      </Suspense>
    </main>
  )
}