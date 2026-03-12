import type { Metadata } from "next"
import { ShopBrowseView } from "@/components/shop/ShopBrowseView"
import { fetchListings } from "@/lib/shop/getListings"

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const metadata: Metadata = {
  title: "Shop | Mineral Kingdom",
  description: "Browse fixed-price and auction-backed mineral listings.",
  alternates: {
    canonical: "/shop",
  },
}

export default async function ShopPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const data = await fetchListings(resolvedSearchParams)

  return (
    <ShopBrowseView
      data={data}
      searchParams={resolvedSearchParams}
      eyebrow="Mineral Kingdom Shop"
      title="Browse listings"
      description="Explore fixed-price specimens and live auction inventory. Filter by mineral type, size class, price, or fluorescent material."
    />
  )
}