import Link from "next/link"
import {
  HomeSectionDto,
  formatMoney,
} from "@/lib/home/getHomeSections"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LocalTime } from "@/components/ui/LocalTime"
import { Button } from "@/components/ui/button"

type HomeSectionProps = {
  section: HomeSectionDto
  kind: "listing" | "auction"
}

function getSavingsLabel(item: HomeSectionDto["items"][number], kind: "listing" | "auction") {
  if (kind === "auction") return null

  if (
    typeof item.priceCents !== "number" ||
    typeof item.effectivePriceCents !== "number" ||
    item.effectivePriceCents >= item.priceCents
  ) {
    return null
  }

  if (item.discountType === "PERCENT" && typeof item.discountPercentBps === "number") {
    return `${(item.discountPercentBps / 100).toFixed(0)}% off`
  }

  const savingsCents = item.priceCents - item.effectivePriceCents
  if (savingsCents > 0) {
    return `Save ${formatMoney(savingsCents) ?? "—"}`
  }

  return null
}

function isScheduledAuction(item: HomeSectionDto["items"][number], kind: "listing" | "auction") {
  return kind === "auction" && (item.status ?? "").toUpperCase() === "SCHEDULED"
}

export function HomeSection({ section, kind }: HomeSectionProps) {
  return (
    <section
      className="space-y-4"
      data-testid={`home-section-${section.title.toLowerCase().replace(/\s+/g, "-")}`}
    >
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
            const scheduledAuction = isScheduledAuction(item, kind)

            const displayPrice =
              kind === "auction"
                ? scheduledAuction
                  ? formatMoney(item.startingPriceCents ?? item.currentBidCents)
                  : formatMoney(item.currentBidCents)
                : formatMoney(item.effectivePriceCents ?? item.priceCents)

            const originalPrice =
              kind === "listing" &&
                typeof item.priceCents === "number" &&
                typeof item.effectivePriceCents === "number" &&
                item.effectivePriceCents < item.priceCents
                ? formatMoney(item.priceCents)
                : null

            const savingsLabel = getSavingsLabel(item, kind)
            const endsAt = kind === "auction" && !scheduledAuction ? item.endsAt : null
            const startsAt = kind === "auction" && scheduledAuction ? item.startTime : null

            return (
              <Card
                key={`${item.listingId}-${item.auctionId ?? "listing"}`}
                className="flex h-full flex-col overflow-hidden"
              >
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
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {kind === "auction"
                      ? scheduledAuction
                        ? "Upcoming Auction"
                        : item.status ?? "Auction"
                      : "Listing"}
                  </div>
                  <CardTitle className="line-clamp-2 text-base">{item.title}</CardTitle>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col space-y-2 text-sm">
                  {displayPrice ? (
                    kind === "auction" ? (
                      scheduledAuction ? (
                        <div className="min-h-[56px] space-y-1">
                          <div className="font-medium">{`Opening bid: ${displayPrice}`}</div>
                          {startsAt ? (
                            <div className="text-muted-foreground">Starts: <LocalTime value={startsAt} /></div>
                          ) : (
                            <div className="h-[20px]" />
                          )}
                        </div>
                      ) : (
                        <div className="min-h-[56px] space-y-1">
                          <div className="font-medium">{`Current bid: ${displayPrice}`}</div>
                          {endsAt ? (
                            <div className="text-muted-foreground">Ends: <LocalTime value={endsAt} /></div>
                          ) : (
                            <div className="h-[20px]" />
                          )}
                        </div>
                      )
                    ) : (
                      <div className="min-h-[72px] space-y-1">
                        <div className="font-medium">{displayPrice}</div>
                        <div
                          className={`text-sm text-muted-foreground ${originalPrice ? "line-through" : "invisible"}`}
                        >
                          {originalPrice ?? "$0.00"}
                        </div>
                        <div
                          className={`text-xs font-medium text-emerald-700 ${savingsLabel ? "" : "invisible"}`}
                        >
                          {savingsLabel ?? "placeholder"}
                        </div>
                      </div>
                    )
                  ) : null}
                </CardContent>

                <CardFooter className="mt-auto">
                  <Button asChild className="w-full">
                    <Link href={item.href}>
                      {kind === "auction"
                        ? scheduledAuction
                          ? "View upcoming auction"
                          : "View auction"
                        : "View listing"}
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