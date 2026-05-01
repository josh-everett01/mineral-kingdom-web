import { Suspense } from "react"
import { Container } from "@/components/site/Container"
import { ShippingInvoicePaymentReturnClient } from "@/components/shipping-invoices/ShippingInvoicePaymentReturnClient"

function ShippingInvoicePaymentReturnFallback() {
  return (
    <div className="mk-preview-page min-h-screen overflow-x-hidden">
      <Container className="py-8 sm:py-10">
        <div className="mx-auto max-w-4xl">
          <section className="mk-glass-strong rounded-[2rem] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              Shipping payment return
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
              Loading shipping payment return
            </h1>
            <p className="mt-2 text-sm leading-6 mk-muted-text">
              We are restoring your shipping payment state from the backend.
            </p>
          </section>
        </div>
      </Container>
    </div>
  )
}

export default function ShippingInvoicePaymentReturnPage() {
  return (
    <Suspense fallback={<ShippingInvoicePaymentReturnFallback />}>
      <div className="mk-preview-page min-h-screen overflow-x-hidden">
        <Container className="py-8 sm:py-10">
          <ShippingInvoicePaymentReturnClient />
        </Container>
      </div>
    </Suspense>
  )
}