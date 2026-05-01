import { notFound } from "next/navigation"
import { OrderConfirmationClient } from "@/components/orders/OrderConfirmationClient"
import { Container } from "@/components/site/Container"

type Props = {
  searchParams: Promise<{ orderId?: string; paymentId?: string }>
}

export default async function OrderConfirmationPage({ searchParams }: Props) {
  const { orderId, paymentId } = await searchParams

  if (!orderId) {
    notFound()
  }

  return (
    <div className="mk-preview-page min-h-screen overflow-x-hidden">
      <Container className="py-8 sm:py-10" data-testid="order-confirmation-page">
        <div className="mx-auto max-w-4xl">
          <OrderConfirmationClient
            orderId={orderId}
            initialPaymentId={paymentId ?? null}
          />
        </div>
      </Container>
    </div>
  )
}