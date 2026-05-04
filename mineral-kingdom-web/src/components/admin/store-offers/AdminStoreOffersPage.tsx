"use client"

import { useEffect, useMemo, useState } from "react"
import { ShoppingBag } from "lucide-react"

import { AdminStoreOfferDefinitionNotice } from "@/components/admin/store-offers/AdminStoreOfferDefinitionNotice"
import { AdminStoreOfferForm } from "@/components/admin/store-offers/AdminStoreOfferForm"
import { AdminStoreOffersTable } from "@/components/admin/store-offers/AdminStoreOffersTable"
import { getAdminStoreOffers } from "@/lib/admin/store-offers/api"
import { AdminStoreOfferListItem } from "@/lib/admin/store-offers/types"

export function AdminStoreOffersPage() {
  const [items, setItems] = useState<AdminStoreOfferListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdminStoreOfferListItem | null>(null)

  async function load() {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAdminStoreOffers()
      setItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load store offers.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const activeCount = useMemo(() => items.filter((x) => x.isActive).length, [items])

  const publishedCount = useMemo(
    () => items.filter((x) => x.listingStatus?.toUpperCase() === "PUBLISHED").length,
    [items],
  )

  return (
    <div data-testid="admin-store-offers-page" className="space-y-6">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-gold)]">
            <ShoppingBag className="h-5 w-5" />
          </span>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              Admin commerce
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
              Store Offers
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text">
              Create and manage fixed-price buyer offers, sale pricing, and discount presentation
              without changing the listing’s core specimen record.
            </p>
          </div>
        </div>
      </section>

      <AdminStoreOfferDefinitionNotice />

      {error ? (
        <div
          data-testid="admin-store-offers-error"
          className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-4 text-sm text-[color:var(--mk-danger)]"
        >
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Total offers" value={items.length} />
        <SummaryCard label="Active offers" value={activeCount} />
        <SummaryCard label="Published listing offers" value={publishedCount} />
      </section>

      <AdminStoreOfferForm
        editing={editing}
        onSaved={async () => {
          setEditing(null)
          await load()
        }}
      />

      <AdminStoreOffersTable
        items={items}
        isLoading={isLoading}
        onEdit={(item) => setEditing(item)}
        onChanged={async () => {
          await load()
        }}
      />
    </div>
  )
}

function SummaryCard({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="mk-glass rounded-[2rem] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
        {value}
      </p>
    </div>
  )
}