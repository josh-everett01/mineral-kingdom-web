import Link from "next/link"
import { HomeSectionDto, formatEndsAt, formatMoney } from "@/lib/home/getHomeSections"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type HomeSectionProps = {
  section: HomeSectionDto
  kind: "listing" | "auction"
}

export function HomeSection({ section, kind }: HomeSectionProps) {
  return (
    <section className="space-y-4" data-testid={`home-section-${section.title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
          <p className="text-sm text-muted-foreground">
            {section.count} item{section.count === 1 ? "" : "s"}
          </p>
        </div>

        <Button asChild variant="outline">
          <Link
            href={section.browseHref}
            data-testid={`home-section-browse-${section.title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            Browse all
          </Link>
        </Button>
      </div>

      {section.items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Nothing to show yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {section.items.map((item) => {
            const displayPrice =
              kind === "auction"
                ? formatMoney(item.currentBidCents)
                : formatMoney(item.effectivePriceCents ?? item.priceCents)

            const endsAt = kind === "auction" ? formatEndsAt(item.endsAt) : null

            return (
              <Card key={`${item.listingId}-${item.auctionId ?? "listing"}`} className="overflow-hidden">
                {item.primaryImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.primaryImageUrl}
                    alt={item.title}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-muted text-sm text-muted-foreground">
                    No image available
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="line-clamp-2 text-base">{item.title}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-2 text-sm">
                  {displayPrice ? (
                    <div className="font-medium">
                      {kind === "auction" ? `Current bid: ${displayPrice}` : displayPrice}
                    </div>
                  ) : null}

                  {endsAt ? (
                    <div className="text-muted-foreground">Ends: {endsAt}</div>
                  ) : null}
                </CardContent>

                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={item.href}>
                      {kind === "auction" ? "View Auction" : "View Listing"}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}