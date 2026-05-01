import type { Metadata } from "next"
import { ShopBrowseView } from "@/components/shop/ShopBrowseView"
import { fetchListings } from "@/lib/shop/getListings"

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const metadata: Metadata = {
  title: "Shop | Mineral Kingdom",
  description: "Browse available fixed-price mineral specimens.",
  alternates: {
    canonical: "/shop",
  },
}

export default async function ShopPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams

  const shopSearchParams = {
    ...resolvedSearchParams,
    listingType: "STORE",
  }

  const data = await fetchListings(shopSearchParams)

  return (
    <ShopBrowseView
      data={data}
      searchParams={shopSearchParams}
      eyebrow="Mineral Kingdom Shop"
      title="Available Now"
      description="Browse fixed-price mineral specimens that are available for direct purchase."
    />
  )
}