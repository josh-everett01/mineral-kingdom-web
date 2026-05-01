import { Suspense } from "react"

import { OrderPaymentReturnClient } from "@/components/orders/OrderPaymentReturnClient"
import { Container } from "@/components/site/Container"

function OrderReturnFallback() {
  return (
    <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
        Order payment return
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
        Verifying payment state
      </h1>
      <p className="mt-3 text-sm leading-6 mk-muted-text sm:text-base">
        We are waiting for backend-confirmed payment state.
      </p>
    </section>
  )
}

export default function OrderReturnPage() {
  return (
    <div className="mk-preview-page min-h-screen overflow-x-hidden">
      <Container className="py-8 sm:py-10" data-testid="order-payment-return-page">
        <div className="mx-auto max-w-3xl">
          <Suspense fallback={<OrderReturnFallback />}>
            <OrderPaymentReturnClient />
          </Suspense>
        </div>
      </Container>
    </div>
  )
}