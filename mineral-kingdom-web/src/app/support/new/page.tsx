import { SupportRequestForm } from "@/components/support/SupportRequestForm"
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

  // If multiple linked ids are provided (malformed URL), ignore all links
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
    <main
      className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8"
      data-testid="support-new-page"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Contact support</h1>
        <p className="mt-2 text-sm text-stone-600">
          Fill out the form below and our team will get back to you by email.
        </p>
      </div>

      <SupportRequestForm
        defaultCategory={defaultCategory}
        linkedContext={context}
        contextLabel={contextLabel}
      />
    </main>
  )
}
