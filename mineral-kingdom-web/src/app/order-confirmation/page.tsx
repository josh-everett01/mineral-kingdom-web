import { notFound } from "next/navigation"
import { OrderConfirmationClient } from "@/components/orders/OrderConfirmationClient"

type Props = {
  searchParams: Promise<{ orderId?: string; paymentId?: string }>
}

export default async function OrderConfirmationPage({ searchParams }: Props) {
  const { orderId, paymentId } = await searchParams

  if (!orderId) {
    notFound()
  }

  return (
    <main
      className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8"
      data-testid="order-confirmation-page"
    >
      <OrderConfirmationClient orderId={orderId} initialPaymentId={paymentId ?? null} />
    </main>
  )
}