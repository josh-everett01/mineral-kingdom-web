import { Suspense } from "react"
import { ShippingInvoicePaymentReturnClient } from "@/components/shipping-invoices/ShippingInvoicePaymentReturnClient"

export default function ShippingInvoicePaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-stone-600">Loading shipping payment return…</p>
          </div>
        </div>
      }
    >
      <ShippingInvoicePaymentReturnClient />
    </Suspense>
  )
}