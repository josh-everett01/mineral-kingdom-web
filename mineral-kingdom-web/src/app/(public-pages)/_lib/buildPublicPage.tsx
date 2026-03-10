import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  fetchPublicPage,
  toAbsoluteCanonical,
  deriveDescriptionFromHtml,
} from "@/lib/pages/getPublicPage"
import { PublicCmsPage } from "@/components/pages/PublicCmsPage"

export function buildPublicPage(slug: string) {
  async function generateMetadata(): Promise<Metadata> {
    const page = await fetchPublicPage(slug)

    if (!page) {
      return {
        title: "Page not found | Mineral Kingdom",
      }
    }

    const title = page.seoTitle?.trim() || page.title || "Mineral Kingdom"
    const description =
      page.seoDescription?.trim() ||
      deriveDescriptionFromHtml(page.contentHtml || "", `${title} | Mineral Kingdom`)

    const canonical = page.canonicalUrl?.trim() || `/${slug}`

    return {
      title,
      description,
      alternates: {
        canonical: await toAbsoluteCanonical(canonical),
      },
    }
  }

  async function Page() {
    const page = await fetchPublicPage(slug)

    if (!page) {
      notFound()
    }

    return <PublicCmsPage title={page.title || ""} contentHtml={page.contentHtml || ""} />
  }

  return { generateMetadata, Page }
}