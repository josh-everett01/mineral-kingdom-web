"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminAuctionDefinitionNotice } from "@/components/admin/auctions/AdminAuctionDefinitionNotice"
import { AdminAuctionCreateForm } from "@/components/admin/auctions/AdminAuctionCreateForm"
import { AdminAuctionsTable } from "@/components/admin/auctions/AdminAuctionsTable"
import { getAdminAuctions } from "@/lib/admin/auctions/api"
import { AdminAuctionListItem } from "@/lib/admin/auctions/types"

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "").trim().toUpperCase()
}

function AuctionSection({
  title,
  description,
  items,
  isLoading,
  testId,
}: {
  title: string
  description: string
  items: AdminAuctionListItem[]
  isLoading: boolean
  testId: string
}) {
  return (
    <section data-testid={testId} className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">{title}</h2>
        <p className="text-sm leading-6 mk-muted-text">{description}</p>
      </div>

      <AdminAuctionsTable items={items} isLoading={isLoading} />
    </section>
  )
}

export function AdminAuctionsPage() {
  const [items, setItems] = useState<AdminAuctionListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAdminAuctions()
      setItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load auctions.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const { liveItems, futureItems, draftItems, otherItems } = useMemo(() => {
    const live: AdminAuctionListItem[] = []
    const future: AdminAuctionListItem[] = []
    const draft: AdminAuctionListItem[] = []
    const other: AdminAuctionListItem[] = []

    for (const item of items) {
      const status = normalizeStatus(item.status)

      if (status === "LIVE" || status === "CLOSING") {
        live.push(item)
      } else if (status === "SCHEDULED") {
        future.push(item)
      } else if (status === "DRAFT") {
        draft.push(item)
      } else {
        other.push(item)
      }
    }

    return {
      liveItems: live,
      futureItems: future,
      draftItems: draft,
      otherItems: other,
    }
  }, [items])

  return (
    <div data-testid="admin-auctions-page" className="space-y-6">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Admin auctions
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
          Auctions
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text">
          Create auction schedules, review draft and live auctions, monitor bids, and manage pre-launch
          pricing or reserve settings. Auction settings can only be edited before launch; once an auction
          is live, schedule, pricing, reserve, and shipping quote fields are locked to protect bidding
          fairness.
        </p>
      </section>

      <AdminAuctionDefinitionNotice />

      <section className="rounded-[2rem] border border-[color:var(--mk-gold)]/40 bg-[color:var(--mk-panel-muted)] p-5 text-sm shadow-sm">
        <p className="font-semibold text-[color:var(--mk-ink)]">
          Confirm auction settings before launch.
        </p>
        <p className="mt-2 leading-6 mk-muted-text">
          Draft and Scheduled auctions can be edited. Live, Closing, and completed auctions are
          operationally locked so bidders see a stable, auditable auction state.
        </p>
      </section>

      {error ? (
        <section className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
          {error}
        </section>
      ) : null}

      <AdminAuctionCreateForm
        onCreated={async () => {
          await load()
        }}
      />

      <AuctionSection
        title="Live auctions"
        description="Auctions currently accepting bids or inside their closing window."
        items={liveItems}
        isLoading={isLoading}
        testId="admin-auctions-live-section"
      />

      <AuctionSection
        title="Future auctions"
        description="Scheduled auctions that are visible operationally but have not opened for bidding yet."
        items={futureItems}
        isLoading={isLoading}
        testId="admin-auctions-future-section"
      />

      <AuctionSection
        title="Draft auctions"
        description="Auctions being prepared before launch. Review pricing, reserve, shipping, and timing before going live."
        items={draftItems}
        isLoading={isLoading}
        testId="admin-auctions-draft-section"
      />

      {otherItems.length > 0 ? (
        <AuctionSection
          title="Other auctions"
          description="Recently ended or otherwise non-active auctions."
          items={otherItems}
          isLoading={isLoading}
          testId="admin-auctions-other-section"
        />
      ) : null}
    </div>
  )
}