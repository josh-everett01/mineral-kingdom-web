export function AdminAuctionDefinitionNotice() {
  return (
    <section
      data-testid="admin-auction-definition-notice"
      className="rounded-[2rem] border border-[color:var(--mk-gold)]/35 bg-[color:var(--mk-panel-muted)] p-5 text-sm shadow-sm"
    >
      <div className="font-semibold text-[color:var(--mk-ink)]">How auction editing works</div>

      <p className="mt-2 leading-6 mk-muted-text">
        Auctions are created from published listings and can begin as drafts, scheduled auctions, or
        immediate launches. Review timing, starting price, reserve, quoted shipping, and regional
        shipping before the auction goes live.
      </p>

      <p className="mt-2 leading-6 mk-muted-text">
        Once bidding starts, auction settings are intentionally locked to protect bidder trust,
        fairness, and auditability. Live and closing auctions should be monitored, not edited.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <AuctionStatusPill
          title="Draft"
          body="Safe to edit. Use this while preparing timing, reserve, pricing, and shipping."
        />
        <AuctionStatusPill
          title="Scheduled"
          body="Still pre-launch. Review carefully before the start time or manual launch."
        />
        <AuctionStatusPill
          title="Live / Closing"
          body="Locked for editing. Bidding history and buyer trust must be preserved."
        />
      </div>

      <div className="mt-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] p-4">
        <p className="font-semibold text-[color:var(--mk-ink)]">Before launching</p>
        <p className="mt-1 leading-6 mk-muted-text">
          Confirm the listing, start time, close time or duration, starting price, reserve, quoted
          shipping, and regional shipping rates. After launch, changes should require a controlled
          backend/admin workflow rather than normal inline editing.
        </p>
      </div>
    </section>
  )
}

function AuctionStatusPill({
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