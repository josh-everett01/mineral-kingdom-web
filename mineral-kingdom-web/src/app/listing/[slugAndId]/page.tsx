import { notFound } from "next/navigation"
import { fetchListingDetail } from "@/lib/listings/getListingDetail"

type Props = {
  params: Promise<{ slugAndId: string }>
}

function extractGuid(slugAndId: string): string | null {
  const match = slugAndId.match(
    /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/,
  )

  return match ? match[1] : null
}

export default async function ListingDetailPage({ params }: Props) {
  const { slugAndId } = await params
  const id = extractGuid(slugAndId)

  if (!id) {
    notFound()
  }

  const listing = await fetchListingDetail(id)

  if (!listing) {
    notFound()
  }

  const primaryImage = listing.media.find((m) => m.isPrimary) ?? listing.media[0]

  return (
    <main
      className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8"
      data-testid="listing-detail-page"
    >
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="aspect-square bg-stone-100">
          {primaryImage?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryImage.url}
              alt={listing.title ?? "Listing image"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-stone-500">
              No image available
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Listing
          </p>
          <h1
            className="text-3xl font-bold tracking-tight text-stone-900"
            data-testid="listing-detail-title"
          >
            {listing.title ?? "Untitled listing"}
          </h1>
          <p className="text-sm text-stone-500">Status: {listing.status}</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Description</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-700">
            {listing.description?.trim() || "No description available yet."}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Specimen details</h2>
          <dl className="mt-3 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-stone-900">Published</dt>
              <dd>{listing.publishedAt ? new Date(listing.publishedAt).toLocaleString() : "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-stone-900">Weight</dt>
              <dd>{listing.weightGrams ? `${listing.weightGrams} g` : "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-stone-900">Length</dt>
              <dd>{listing.lengthCm ? `${listing.lengthCm} cm` : "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-stone-900">Width</dt>
              <dd>{listing.widthCm ? `${listing.widthCm} cm` : "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-stone-900">Height</dt>
              <dd>{listing.heightCm ? `${listing.heightCm} cm` : "—"}</dd>
            </div>
            <div>
              <dt className="font-medium text-stone-900">Country code</dt>
              <dd>{listing.countryCode ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  )
}