import type { Metadata } from "next"
import { ShopBrowseView } from "@/components/shop/ShopBrowseView"
import { normalizeMineralRouteName } from "@/lib/shop/categoryRoutes"
import { fetchListings } from "@/lib/shop/getListings"

type Props = {
  params: Promise<{ name: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { name } = await params
  const mineralName = normalizeMineralRouteName(name)

  return {
    title: `${mineralName} Specimens | Mineral Kingdom`,
    description: `Browse currently available ${mineralName} specimens on Mineral Kingdom.`,
    alternates: {
      canonical: `/shop/mineral/${encodeURIComponent(mineralName)}`,
    },
  }
}

export default async function ShopMineralPage({ params, searchParams }: Props) {
  const { name } = await params
  const resolvedSearchParams = await searchParams
  const mineralName = normalizeMineralRouteName(name)

  const mergedSearchParams: Record<string, string | string[] | undefined> = {
    ...resolvedSearchParams,
    mineralType: mineralName,
  }

  const data = await fetchListings(mergedSearchParams)

  return (
    <ShopBrowseView
      data={data}
      searchParams={mergedSearchParams}
      eyebrow="Mineral Category"
      title={`${mineralName} Specimens`}
      description={`Browse currently available fixed-price and auction-backed ${mineralName} listings.`}
      testId="shop-mineral-page"
    />
  )
}