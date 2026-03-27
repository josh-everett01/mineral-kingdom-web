import { OrderDetailClient } from "@/components/orders/OrderDetailClient"

type Props = {
  params: Promise<{ orderId: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params

  return (
    <main
      className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8"
      data-testid="order-detail-page"
    >
      <OrderDetailClient orderId={orderId} />
    </main>
  )
}