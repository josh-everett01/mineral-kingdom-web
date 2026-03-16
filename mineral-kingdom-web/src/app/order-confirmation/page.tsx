import { OrderConfirmationClient } from "@/components/orders/OrderConfirmationClient"

type Props = {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ paymentId?: string }>
}

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const { orderId } = await params
  const { paymentId } = await searchParams

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8" data-testid="order-confirmation-page">
      <OrderConfirmationClient orderId={orderId} initialPaymentId={paymentId ?? null} />
    </main>
  )
}
