import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { AuctionDetailView } from "@/components/auctions/AuctionDetailView"
import { fetchAuctionDetail } from "@/lib/auctions/getAuctionDetail"

type Props = {
  params: Promise<{ auctionId: string }>
}

export const metadata: Metadata = {
  title: "Auction Detail | Mineral Kingdom",
}

export default async function AuctionDetailPage({ params }: Props) {
  const { auctionId } = await params
  const result = await fetchAuctionDetail(auctionId)

  if (result.kind === "not-found") {
    notFound()
  }

  if (result.kind === "error") {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"
          data-testid="auction-detail-error-state"
        >
          {result.message}
        </div>
      </main>
    )
  }

  if (result.kind === "auth-expired") {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900"
          data-testid="auction-detail-auth-expired-state"
        >
          {result.message}
        </div>
      </main>
    )
  }

  return <AuctionDetailView data={result.data} />
}