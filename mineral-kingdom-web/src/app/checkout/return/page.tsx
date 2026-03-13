export default function CheckoutReturnPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8" data-testid="checkout-return-page">
      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Checkout Return
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          We recorded your return from the payment provider
        </h1>
        <p className="text-sm text-stone-600 sm:text-base">
          Payment is not confirmed from this page alone. Final payment status will be verified
          separately before order confirmation is shown.
        </p>
      </section>
    </main>
  )
}