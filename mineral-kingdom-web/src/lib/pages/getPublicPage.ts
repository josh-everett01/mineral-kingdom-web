import { headers } from "next/headers"

export type PublicPageDto = {
  slug?: string | null
  title?: string | null
  contentHtml?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  canonicalUrl?: string | null
  publishedAt?: string | null
}

const RETRYABLE_STATUS_CODES = new Set([502, 503, 504])

async function getAppOrigin(): Promise<string> {
  const h = await headers()

  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http")

  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    "localhost:3000"

  return `${proto}://${host}`
}

function normalizePageDto(dto: PublicPageDto): Required<
  Pick<PublicPageDto, "slug" | "title" | "contentHtml" | "canonicalUrl">
> & PublicPageDto {
  return {
    ...dto,
    slug: dto.slug?.trim() || "",
    title: dto.title?.trim() || "",
    contentHtml: dto.contentHtml ?? "",
    canonicalUrl: dto.canonicalUrl?.trim() || "",
  }
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchPublicPage(slug: string): Promise<ReturnType<typeof normalizePageDto> | null> {
  const origin = await getAppOrigin()

  let lastStatus: number | null = null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(`${origin}/api/bff/pages/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    })

    if (res.status === 404) {
      return null
    }

    if (res.ok) {
      const dto = (await res.json()) as PublicPageDto
      return normalizePageDto(dto)
    }

    lastStatus = res.status

    if (!RETRYABLE_STATUS_CODES.has(res.status) || attempt === 2) {
      throw new Error(`Failed to load public page "${slug}" (${res.status})`)
    }

    await delay(250 * (attempt + 1))
  }

  throw new Error(`Failed to load public page "${slug}" (${lastStatus ?? "unknown"})`)
}

export async function toAbsoluteCanonical(canonicalUrl?: string | null): Promise<string> {
  const origin = await getAppOrigin()

  if (!canonicalUrl || !canonicalUrl.trim()) {
    return origin
  }

  if (/^https?:\/\//i.test(canonicalUrl)) {
    return canonicalUrl
  }

  return `${origin}${canonicalUrl.startsWith("/") ? canonicalUrl : `/${canonicalUrl}`}`
}

export function deriveDescriptionFromHtml(html: string, fallback: string): string {
  const stripped = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  if (!stripped) return fallback
  return stripped.length <= 160 ? stripped : stripped.slice(0, 160)
}
