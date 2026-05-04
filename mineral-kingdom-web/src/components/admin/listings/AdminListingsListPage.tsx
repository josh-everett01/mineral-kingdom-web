"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Box, PlusCircle } from "lucide-react"

import { AdminListingDefinitionNotice } from "@/components/admin/listings/AdminListingDefinitionNotice"
import { AdminListingsTable } from "@/components/admin/listings/AdminListingsTable"
import { createAdminDraftListing, getAdminListings } from "@/lib/admin/listings/api"
import { AdminListingListItem } from "@/lib/admin/listings/types"

const adminInputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20"

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

  const statusCounts = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const status = item.status.toUpperCase()
        if (status === "DRAFT") acc.draft += 1
        else if (status === "PUBLISHED") acc.published += 1
        else if (status === "ARCHIVED") acc.archived += 1
        else acc.other += 1
        return acc
      },
      { draft: 0, published: 0, archived: 0, other: 0 },
    )
  }, [items])

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
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-gold)]">
              <Box className="h-5 w-5" />
            </span>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
                Admin inventory
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
                Listings
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text">
                Create and manage specimen catalog records. A listing becomes sellable only after it
                is connected to a fixed-price store offer or auction workflow.
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="admin-create-draft-listing"
            onClick={() => void handleCreateDraft()}
            disabled={isCreating}
            className="mk-cta inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusCircle className="h-4 w-4" />
            {isCreating ? "Creating…" : "Create draft listing"}
          </button>
        </div>
      </section>

      <AdminListingDefinitionNotice />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatusSummaryCard label="Draft" value={statusCounts.draft} />
        <StatusSummaryCard label="Published" value={statusCounts.published} />
        <StatusSummaryCard label="Archived" value={statusCounts.archived} />
      </section>

      {error ? (
        <div
          data-testid="admin-listings-error"
          className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-4 text-sm text-[color:var(--mk-danger)]"
        >
          {error}
        </div>
      ) : null}

      <section className="mk-glass-strong rounded-[2rem] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label
              htmlFor="admin-listings-search"
              className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]"
            >
              Search
            </label>
            <input
              id="admin-listings-search"
              data-testid="admin-listings-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, mineral, or locality"
              className={adminInputClass}
            />
          </div>

          <div className="sm:w-56">
            <label
              htmlFor="admin-listings-status-filter"
              className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]"
            >
              Status
            </label>
            <select
              id="admin-listings-status-filter"
              data-testid="admin-listings-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={adminInputClass}
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </section>

      <AdminListingsTable items={filteredItems} isLoading={isLoading} />
    </div>
  )
}

function StatusSummaryCard({
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