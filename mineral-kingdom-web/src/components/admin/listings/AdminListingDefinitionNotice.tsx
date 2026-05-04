export function AdminListingDefinitionNotice() {
  return (
    <section
      data-testid="admin-listing-definition-notice"
      className="rounded-[2rem] border border-[color:var(--mk-gold)]/35 bg-[color:var(--mk-panel-muted)] p-5 text-sm shadow-sm"
    >
      <div className="font-semibold text-[color:var(--mk-ink)]">
        How listings, offers, and auctions work together
      </div>

      <p className="mt-2 leading-6 mk-muted-text">
        A <span className="font-semibold text-[color:var(--mk-ink)]">Listing</span> is the core
        inventory/specimen record. It stores title, mineral details, locality, dimensions, media,
        inventory, and catalog lifecycle state.
      </p>

      <p className="mt-2 leading-6 mk-muted-text">
        Publishing a listing means the catalog record is ready for downstream commerce workflows,
        but it does <span className="font-semibold text-[color:var(--mk-ink)]">not</span> by itself
        make the item purchasable or bidable.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <DefinitionPill
          title="Draft"
          body="Still being prepared. Not ready for buyer-facing commerce."
        />
        <DefinitionPill
          title="Published"
          body="Catalog-ready. Can be connected to a store offer or auction workflow."
        />
        <DefinitionPill
          title="Archived"
          body="Retired or hidden from normal listing workflows."
        />
      </div>

      <div className="mt-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] p-4">
        <p className="font-semibold text-[color:var(--mk-ink)]">Commerce path guidance</p>
        <p className="mt-1 leading-6 mk-muted-text">
          A physical specimen should normally have one active commerce path: either a fixed-price
          store offer or an auction. Store offer and auction assignment rules will be enforced by
          backend validation so a listing cannot accidentally be sold through multiple paths.
        </p>
      </div>
    </section>
  )
}

function DefinitionPill({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 mk-muted-text">{body}</p>
    </div>
  )
}