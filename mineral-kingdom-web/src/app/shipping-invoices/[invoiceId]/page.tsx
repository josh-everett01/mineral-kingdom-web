import { ShippingInvoiceDetailClient } from '@/components/shipping-invoices/ShippingInvoiceDetailClient'

type PageProps = {
  params: Promise<{
    invoiceId: string
  }>
}

export default async function ShippingInvoiceDetailPage({ params }: PageProps) {
  const { invoiceId } = await params

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <ShippingInvoiceDetailClient invoiceId={invoiceId} />
    </div>
  )
}