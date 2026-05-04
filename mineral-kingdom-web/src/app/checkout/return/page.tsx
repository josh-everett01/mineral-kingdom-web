import { Suspense } from "react"

import { CheckoutReturnClient } from "@/components/checkout/CheckoutReturnClient"
import { Container } from "@/components/site/Container"

function CheckoutReturnFallback() {
  return (
    <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
        Checkout return
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
        We recorded your return from the payment provider
      </h1>
      <p className="mt-3 text-sm leading-6 mk-muted-text sm:text-base">
        We are restoring your checkout return state now.
      </p>
    </section>
  )
}

export default function CheckoutReturnPage() {
  return (
    <div className="mk-preview-page min-h-screen overflow-x-hidden">
      <Container className="py-8 sm:py-10" data-testid="checkout-return-page">
        <div className="mx-auto max-w-3xl">
          <Suspense fallback={<CheckoutReturnFallback />}>
            <CheckoutReturnClient />
          </Suspense>
        </div>
      </Container>
    </div>
  )
}