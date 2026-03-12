export type CartLineDto = {
  offerId: string
  listingId: string
  listingHref: string
  title: string
  primaryImageUrl?: string | null
  quantity: number
  quantityAvailable: number
  priceCents: number
  effectivePriceCents: number
  canUpdateQuantity: boolean
}

export type CartDto = {
  cartId: string
  userId?: string | null
  status: string
  subtotalCents: number
  warnings: string[]
  lines: CartLineDto[]
}

export function formatMoney(cents?: number | null): string | null {
  if (typeof cents !== "number") return null

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100)
}