import { CheckoutPayClient } from "@/components/checkout/CheckoutPayClient"

type Props = {
  searchParams: Promise<{
    holdId?: string
  }>
}

export default async function CheckoutPayPage({ searchParams }: Props) {
  const { holdId } = await searchParams

  return (
    <main
      className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8"
      data-testid="checkout-pay-page"
    >
      <CheckoutPayClient initialHoldId={holdId ?? null} />
    </main>
  )
}