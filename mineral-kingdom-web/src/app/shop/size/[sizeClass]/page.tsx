import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ShopBrowseView } from "@/components/shop/ShopBrowseView"
import {
  formatSizeClassLabel,
  isValidSizeClass,
  normalizeSizeClassRoute,
} from "@/lib/shop/categoryRoutes"
import { fetchListings } from "@/lib/shop/getListings"

type Props = {
  params: Promise<{ sizeClass: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { sizeClass } = await params
  const normalized = normalizeSizeClassRoute(sizeClass)

  if (!isValidSizeClass(normalized)) {
    return {
      title: "Not Found | Mineral Kingdom",
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return {
    title: `${formatSizeClassLabel(normalized)} Specimens | Mineral Kingdom`,
    description: `Browse currently available ${formatSizeClassLabel(normalized)} mineral listings on Mineral Kingdom.`,
    alternates: {
      canonical: `/shop/size/${normalized}`,
    },
  }
}

export default async function ShopSizePage({ params, searchParams }: Props) {
  const { sizeClass } = await params
  const resolvedSearchParams = await searchParams
  const normalized = normalizeSizeClassRoute(sizeClass)

  if (!isValidSizeClass(normalized)) {
    notFound()
  }

  const mergedSearchParams: Record<string, string | string[] | undefined> = {
    ...resolvedSearchParams,
    sizeClass: normalized,
  }

  const data = await fetchListings(mergedSearchParams)

  return (
    <ShopBrowseView
      data={data}
      searchParams={mergedSearchParams}
      eyebrow="Size Category"
      title={`${formatSizeClassLabel(normalized)} Specimens`}
      description={`Browse currently available ${formatSizeClassLabel(normalized).toLowerCase()} listings.`}
      testId="shop-size-page"
    />
  )
}