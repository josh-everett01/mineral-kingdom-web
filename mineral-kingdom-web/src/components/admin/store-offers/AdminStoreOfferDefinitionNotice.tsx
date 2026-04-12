export function AdminStoreOfferDefinitionNotice() {
  return (
    <div
      data-testid="admin-store-offer-definition-notice"
      className="rounded-xl border bg-card p-4 text-sm"
    >
      <div className="font-semibold">How store offers work</div>
      <p className="mt-2 text-muted-foreground">
        A <span className="font-medium text-foreground">Store Offer</span> controls fixed-price
        storefront pricing for a listing without changing the listing’s core specimen data.
      </p>
      <p className="mt-2 text-muted-foreground">
        Offers can be fixed price, flat discount, or percentage discount.
      </p>
      <p className="mt-2 text-muted-foreground">
        The final computed price is previewed in admin and validated again by the backend before
        save.
      </p>
    </div>
  )
}