export function AdminListingDefinitionNotice() {
  return (
    <div
      data-testid="admin-listing-definition-notice"
      className="rounded-xl border bg-card p-4 text-sm"
    >
      <div className="font-semibold">How listings work</div>
      <p className="mt-2 text-muted-foreground">
        A <span className="font-medium text-foreground">Listing</span> is your core inventory
        record. It stores specimen details, locality, dimensions, inventory, and lifecycle state.
      </p>
      <p className="mt-2 text-muted-foreground">
        A <span className="font-medium text-foreground">Store Offer</span> is the fixed-price sale
        setup built from a listing.
      </p>
      <p className="mt-2 text-muted-foreground">
        An <span className="font-medium text-foreground">Auction</span> is the bidding workflow
        built from a listing.
      </p>
      <p className="mt-2 text-muted-foreground">
        Publishing a listing prepares it for downstream storefront or auction workflows, but it does
        not by itself make the item purchasable or bidable.
      </p>
    </div>
  )
}