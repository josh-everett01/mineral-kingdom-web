export function AdminStoreOfferDefinitionNotice() {
  return (
    <section
      data-testid="admin-store-offer-definition-notice"
      className="rounded-[2rem] border border-[color:var(--mk-gold)]/35 bg-[color:var(--mk-panel-muted)] p-5 text-sm shadow-sm"
    >
      <div className="font-semibold text-[color:var(--mk-ink)]">How store offers work</div>

      <p className="mt-2 leading-6 mk-muted-text">
        A <span className="font-semibold text-[color:var(--mk-ink)]">Store Offer</span> is the
        fixed-price commerce path for a published listing. It controls buyer-facing price,
        discounts, and active/inactive sale state without changing the listing’s core specimen data.
      </p>

      <p className="mt-2 leading-6 mk-muted-text">
        A listing being <span className="font-semibold text-[color:var(--mk-ink)]">Published</span>{" "}
        means the catalog record is ready, but it does not automatically mean the item is available
        for a new store offer. A physical specimen should normally have one active commerce path:
        either fixed-price sale or auction.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <DefinitionPill
          title="Fixed price"
          body="Shows one normal direct-buy price to buyers."
        />
        <DefinitionPill
          title="Flat discount"
          body="Subtracts a dollar amount from the base price."
        />
        <DefinitionPill
          title="Percent discount"
          body="Subtracts a percentage from the base price and shows savings."
        />
      </div>

      <div className="mt-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] p-4">
        <p className="font-semibold text-[color:var(--mk-ink)]">Eligibility note</p>
        <p className="mt-1 leading-6 mk-muted-text">
          Only published listings that are not already assigned to an auction, active sale offer,
          or sold order can be selected. Backend validation remains the source of truth for
          preventing duplicate commerce paths.
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
