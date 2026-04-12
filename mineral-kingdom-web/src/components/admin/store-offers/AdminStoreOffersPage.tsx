"use client"

import { useEffect, useMemo, useState } from "react"
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

  const publishedCount = useMemo(
    () => items.filter((x) => x.listingStatus?.toUpperCase() === "PUBLISHED").length,
    [items],
  )

  return (
    <div data-testid="admin-store-offers-page" className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Store Offers</h2>
        <p className="text-sm text-muted-foreground">
          Create and manage fixed-price offers and discounts without changing listing core data.
        </p>
      </div>

      <AdminStoreOfferDefinitionNotice />

      {error ? (
        <div
          data-testid="admin-store-offers-error"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">Offers</div>
          <div className="mt-1 text-2xl font-semibold">{items.length}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">Active offers</div>
          <div className="mt-1 text-2xl font-semibold">{items.filter((x) => x.isActive).length}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">Published listing offers</div>
          <div className="mt-1 text-2xl font-semibold">{publishedCount}</div>
        </div>
      </div>

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