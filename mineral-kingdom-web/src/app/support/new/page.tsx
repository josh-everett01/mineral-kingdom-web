import { SupportRequestForm } from "@/components/support/SupportRequestForm"
import { Container } from "@/components/site/Container"
import type { SupportLinkedContext, SupportTicketCategory } from "@/lib/support/types"
import { SUPPORT_TICKET_CATEGORIES } from "@/lib/support/types"

type Props = {
  searchParams: Promise<{
    orderId?: string
    shippingInvoiceId?: string
    auctionId?: string
    listingId?: string
    category?: string
  }>
}

function resolveContext(params: {
  orderId?: string
  shippingInvoiceId?: string
  auctionId?: string
  listingId?: string
}): SupportLinkedContext {
  const linkedCount =
    (params.orderId ? 1 : 0) +
    (params.shippingInvoiceId ? 1 : 0) +
    (params.auctionId ? 1 : 0) +
    (params.listingId ? 1 : 0)

  if (linkedCount > 1) return { type: "none" }

  if (params.orderId) return { type: "order", id: params.orderId }
  if (params.shippingInvoiceId) return { type: "shippingInvoice", id: params.shippingInvoiceId }
  if (params.auctionId) return { type: "auction", id: params.auctionId }
  if (params.listingId) return { type: "listing", id: params.listingId }

  return { type: "none" }
}

function resolveContextLabel(context: SupportLinkedContext): string | null {
  switch (context.type) {
    case "order":
      return "an order"
    case "shippingInvoice":
      return "a shipping invoice"
    case "auction":
      return "an auction"
    case "listing":
      return "a listing"
    default:
      return null
  }
}

function resolveDefaultCategory(
  context: SupportLinkedContext,
  categoryParam: string | undefined,
): SupportTicketCategory {
  if (
    categoryParam &&
    SUPPORT_TICKET_CATEGORIES.includes(categoryParam as SupportTicketCategory)
  ) {
    return categoryParam as SupportTicketCategory
  }

  switch (context.type) {
    case "order":
      return "ORDER_HELP"
    case "shippingInvoice":
      return "SHIPPING_HELP"
    case "auction":
      return "AUCTION_HELP"
    case "listing":
      return "OTHER"
    default:
      return "OTHER"
  }
}

export const metadata = {
  title: "Contact Support",
}

export default async function SupportNewPage({ searchParams }: Props) {
  const params = await searchParams

  const context = resolveContext({
    orderId: params.orderId,
    shippingInvoiceId: params.shippingInvoiceId,
    auctionId: params.auctionId,
    listingId: params.listingId,
  })

  const defaultCategory = resolveDefaultCategory(context, params.category)
  const contextLabel = resolveContextLabel(context)

  return (
    <div className="mk-preview-page min-h-screen overflow-x-hidden">
      <Container className="py-8 sm:py-10" data-testid="support-new-page">
        <div className="mx-auto max-w-3xl space-y-6">
          <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
            {/* keep your existing hero content here */}
          </section>

          <SupportRequestForm
            defaultCategory={defaultCategory}
            linkedContext={context}
            contextLabel={contextLabel}
          />
        </div>
      </Container>
    </div>
  )
}