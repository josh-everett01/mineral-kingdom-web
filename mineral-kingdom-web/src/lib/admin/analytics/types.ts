export type SalesOverview = {
  fromDateUtc: string
  toDateUtc: string
  grossSalesCents: number
  orderCount: number
  aovCents: number
  storeSalesCents: number
  auctionSalesCents: number
}

export type AuctionOverview = {
  fromDateUtc: string
  toDateUtc: string
  auctionsClosed: number
  auctionsSold: number
  auctionsUnsold: number
  avgFinalPriceCents: number | null
  avgBidsPerAuction: number | null
  reserveMetRate: number | null
  paymentCompletionRate: number | null
}

export type InventoryStatus = {
  publishedListings: number
  lowStockListings: number
  activeAuctions: number
  auctionsEndingSoon: number
}

export type AnalyticsOverview = {
  sales: SalesOverview
  auctions: AuctionOverview
  inventory: InventoryStatus
}

export type SalesDayPoint = {
  dateUtc: string
  grossSalesCents: number
  orderCount: number
  aovCents: number
  storeSalesCents: number
  auctionSalesCents: number
}

export type AuctionDayPoint = {
  dateUtc: string
  auctionsClosed: number
  auctionsSold: number
  auctionsUnsold: number
  avgFinalPriceCents: number | null
  avgBidsPerAuction: number | null
  reserveMetRate: number | null
  paymentCompletionRate: number | null
}