import { Suspense } from "react"
import { CheckoutReturnClient } from "@/components/checkout/CheckoutReturnClient"

function CheckoutReturnFallback() {
  return (
    <main
      className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8"
      data-testid="checkout-return-page"
    >
      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Checkout return
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Loading payment status
        </h1>
        <p className="text-sm text-stone-600">
          We’re restoring your checkout return state now.
        </p>
      </section>
    </main>
  )
}

export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={<CheckoutReturnFallback />}>
      <CheckoutReturnClient />
    </Suspense>
  )
}