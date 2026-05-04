import { OrderDetailClient } from "@/components/orders/OrderDetailClient"
import { Container } from "@/components/site/Container"

type Props = {
  params: Promise<{ orderId: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params

  return (
    <div className="mk-preview-page min-h-screen overflow-x-hidden">
      <Container className="py-8 sm:py-10" data-testid="order-detail-page">
        <div className="mx-auto max-w-4xl">
          <OrderDetailClient orderId={orderId} />
        </div>
      </Container>
    </div>
  )
}