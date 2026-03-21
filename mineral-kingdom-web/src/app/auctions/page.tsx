import type { Metadata } from "next"
import { AuctionBrowseView } from "@/components/auctions/AuctionBrowseView"
import { fetchAuctions } from "@/lib/auctions/getAuctions"

export const metadata: Metadata = {
  title: "Auctions | Mineral Kingdom",
  description: "Browse live and closing mineral auctions.",
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
      title="Browse auctions"
      description="Discover live and closing auctions, watch what’s ending soon, and open auction detail pages for the latest bidding activity."
    />
  )
}