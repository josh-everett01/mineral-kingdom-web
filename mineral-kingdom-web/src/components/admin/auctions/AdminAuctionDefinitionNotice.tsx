export function AdminAuctionDefinitionNotice() {
  return (
    <section
      data-testid="admin-auction-definition-notice"
      className="rounded-xl border bg-muted/30 p-4"
    >
      <h3 className="text-sm font-semibold">Auction model</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Auctions are created from listings and begin as drafts. Admins can review timing, reserve,
        and quoted shipping before launch. High-risk actions such as starting an auction should
        remain tightly controlled.
      </p>
    </section>
  )
}