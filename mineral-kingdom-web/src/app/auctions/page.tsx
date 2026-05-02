import type { Metadata } from "next"
import { AuctionBrowseView } from "@/components/auctions/AuctionBrowseView"
import { fetchAuctions } from "@/lib/auctions/getAuctions"

export const metadata: Metadata = {
  title: "Auctions | Mineral Kingdom",
  description: "Browse live, ending soon, and upcoming mineral auctions.",
  alternates: {
    canonical: "/auctions",
  },
}

export default async function AuctionsPage() {
  const data = await fetchAuctions()

  return (
    <AuctionBrowseView
      data={data}
      eyebrow="Mineral Kingdom Auctions"
      title="Live & Upcoming Auctions"
      description="Bid on active mineral auctions, watch what’s closing soon, and preview scheduled auctions before bidding opens."
    />
  )
}