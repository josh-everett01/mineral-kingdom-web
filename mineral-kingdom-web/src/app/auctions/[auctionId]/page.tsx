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
      <main className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
        <div
          className="mx-auto max-w-5xl rounded-[2rem] border border-[color:var(--mk-danger)] bg-[color:var(--mk-panel-muted)] p-6 text-[color:var(--mk-danger)] shadow-sm"
          data-testid="auction-detail-error-state"
        >
          {result.message}
        </div>
      </main>
    )
  }

  if (result.kind === "auth-expired") {
    return (
      <main className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
        <div
          className="mx-auto max-w-5xl rounded-[2rem] border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel-muted)] p-6 text-[color:var(--mk-gold)] shadow-sm"
          data-testid="auction-detail-auth-expired-state"
        >
          {result.message}
        </div>
      </main>
    )
  }

  return <AuctionDetailView data={result.data} />
}