"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminListingDefinitionNotice } from "@/components/admin/listings/AdminListingDefinitionNotice"
import { AdminListingsTable } from "@/components/admin/listings/AdminListingsTable"
import { createAdminDraftListing, getAdminListings } from "@/lib/admin/listings/api"
import { AdminListingListItem } from "@/lib/admin/listings/types"

export function AdminListingsListPage() {
  const router = useRouter()
  const [items, setItems] = useState<AdminListingListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getAdminListings()
        if (!active) return
        setItems(data)
      } catch (e) {
        if (!active) return
        setError(e instanceof Error ? e.message : "Failed to load listings.")
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()

    return items.filter((item) => {
      const matchesSearch =
        query.length === 0 ||
        (item.title ?? "").toLowerCase().includes(query) ||
        (item.primaryMineralName ?? "").toLowerCase().includes(query) ||
        (item.localityDisplay ?? "").toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === "ALL" || item.status.toUpperCase() === statusFilter.toUpperCase()

      return matchesSearch && matchesStatus
    })
  }, [items, search, statusFilter])

  async function handleCreateDraft() {
    try {
      setIsCreating(true)
      setError(null)

      const created = await createAdminDraftListing()

      if (!created.id) {
        throw new Error("Draft listing was created but no id was returned.")
      }

      router.push(`/admin/listings/${created.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create draft listing.")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div data-testid="admin-listings-page" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Listings</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage listing drafts, publish ready inventory records, and archive retired
            listings.
          </p>
        </div>

        <button
          type="button"
          data-testid="admin-create-draft-listing"
          onClick={() => void handleCreateDraft()}
          disabled={isCreating}
          className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? "Creating…" : "Create draft listing"}
        </button>
      </div>

      <AdminListingDefinitionNotice />

      {error ? (
        <div
          data-testid="admin-listings-error"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label htmlFor="admin-listings-search" className="mb-1 block text-xs font-medium">
            Search
          </label>
          <input
            id="admin-listings-search"
            data-testid="admin-listings-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, mineral, or locality"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="sm:w-56">
          <label htmlFor="admin-listings-status-filter" className="mb-1 block text-xs font-medium">
            Status
          </label>
          <select
            id="admin-listings-status-filter"
            data-testid="admin-listings-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
          >
            <option value="ALL">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      <AdminListingsTable items={filteredItems} isLoading={isLoading} />
    </div>
  )
}