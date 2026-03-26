import { Suspense } from "react"
import { OrderPaymentReturnClient } from "@/components/orders/OrderPaymentReturnClient"

export default function OrderReturnPage() {
  return (
    <main
      className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8"
      data-testid="order-payment-return-page"
    >
      <Suspense
        fallback={
          <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Order Payment Return
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">
              Verifying payment state
            </h1>
            <p className="text-sm text-stone-600 sm:text-base">
              We are waiting for backend-confirmed payment state.
            </p>
          </section>
        }
      >
        <OrderPaymentReturnClient />
      </Suspense>
    </main>
  )
}