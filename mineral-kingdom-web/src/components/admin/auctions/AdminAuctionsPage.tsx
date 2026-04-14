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
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
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
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Auctions</h1>
        <p className="text-sm text-muted-foreground">
          Create auctions, schedule future launches, and monitor live operational status.
        </p>
      </div>

      <AdminAuctionDefinitionNotice />

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <AdminAuctionCreateForm
        onCreated={async () => {
          await load()
        }}
      />

      <AuctionSection
        title="Live auctions"
        description="Auctions currently running or in the closing window."
        items={liveItems}
        isLoading={isLoading}
        testId="admin-auctions-live-section"
      />

      <AuctionSection
        title="Future auctions"
        description="Auctions scheduled to start later."
        items={futureItems}
        isLoading={isLoading}
        testId="admin-auctions-future-section"
      />

      <AuctionSection
        title="Draft auctions"
        description="Auctions still being prepared before launch."
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