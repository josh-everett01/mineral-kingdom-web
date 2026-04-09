"use client"

import { useEffect, useMemo, useState } from "react"

type AdminMineralItem = {
  id: string
  name: string
  listingCount: number
}

type CreateState = {
  name: string
  loading: boolean
  error: string | null
  success: string | null
}

export function AdminMineralsPage() {
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<AdminMineralItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [create, setCreate] = useState<CreateState>({
    name: "",
    loading: false,
    error: null,
    success: null,
  })

  const trimmedSearch = useMemo(() => search.trim(), [search])

  async function loadMinerals(currentSearch?: string) {
    setLoading(true)
    setLoadError(null)

    try {
      const url = new URL("/api/bff/admin/minerals", window.location.origin)

      if ((currentSearch ?? "").trim()) {
        url.searchParams.set("search", (currentSearch ?? "").trim())
      }

      const resp = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
      })

      if (!resp.ok) {
        const text = await resp.text().catch(() => "")
        throw new Error(text || `Failed to load minerals (${resp.status})`)
      }

      const data = (await resp.json()) as AdminMineralItem[]
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load minerals.")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMinerals(search)
  }, [search])

  async function onCreateSubmit(e: React.FormEvent) {
    e.preventDefault()

    const name = create.name.trim()
    if (!name) {
      setCreate((s) => ({ ...s, error: "Mineral name is required.", success: null }))
      return
    }

    setCreate((s) => ({ ...s, loading: true, error: null, success: null }))

    try {
      const resp = await fetch("/api/bff/admin/minerals", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ name }),
      })

      if (!resp.ok) {
        const text = await resp.text().catch(() => "")
        if (resp.status === 409) {
          throw new Error("A mineral with that name already exists.")
        }
        if (resp.status === 400) {
          throw new Error("Mineral name is required.")
        }
        throw new Error(text || `Failed to create mineral (${resp.status})`)
      }

      setCreate({
        name: "",
        loading: false,
        error: null,
        success: "Mineral created.",
      })

      await loadMinerals(trimmedSearch)
    } catch (err) {
      setCreate((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to create mineral.",
        success: null,
      }))
    }
  }

  return (
    <div className="space-y-6" data-testid="admin-minerals-page">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold" data-testid="admin-minerals-title">
          Minerals
        </h1>
        <p className="text-sm text-muted-foreground" data-testid="admin-minerals-description">
          Minerals are catalog reference records used by listings. Listings are inventory records,
          and store offers or auctions are selling modes attached later.
        </p>
      </div>

      <div
        className="rounded-xl border bg-card p-4 text-sm"
        data-testid="admin-minerals-definition-notice"
      >
        <p>
          <span className="font-medium">Mineral</span> = catalog term attached to a listing.
        </p>
        <p>
          <span className="font-medium">Listing</span> = inventory record.
        </p>
        <p>
          <span className="font-medium">Store Offer / Auction</span> = downstream selling mode.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-4 rounded-xl border bg-card p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="admin-minerals-search">
              Search minerals
            </label>
            <input
              id="admin-minerals-search"
              data-testid="admin-minerals-search"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by mineral name"
            />
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading minerals…</div>
          ) : loadError ? (
            <div
              className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              data-testid="admin-minerals-load-error"
            >
              {loadError}
            </div>
          ) : items.length === 0 ? (
            <div
              className="rounded-md border border-dashed p-4 text-sm text-muted-foreground"
              data-testid="admin-minerals-search-empty"
            >
              No minerals found. Create a mineral to use it in listing assignment.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border" data-testid="admin-minerals-list">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Listings</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} data-testid="admin-mineral-row" className="border-t">
                      <td className="px-3 py-2" data-testid="admin-mineral-name-value">
                        {item.name}
                      </td>
                      <td className="px-3 py-2" data-testid="admin-mineral-listing-count">
                        {item.listingCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Create mineral</h2>
            <p className="text-sm text-muted-foreground">
              Add a missing mineral so it can be selected in listing edit.
            </p>
          </div>

          <form className="space-y-3" onSubmit={onCreateSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="admin-mineral-name">
                Mineral name
              </label>
              <input
                id="admin-mineral-name"
                data-testid="admin-mineral-name"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={create.name}
                onChange={(e) =>
                  setCreate((s) => ({
                    ...s,
                    name: e.target.value,
                    error: null,
                    success: null,
                  }))
                }
                placeholder="e.g. Wulfenite"
              />
            </div>

            {create.error ? (
              <div
                className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                data-testid="admin-mineral-create-error"
              >
                {create.error}
              </div>
            ) : null}

            {create.success ? (
              <div
                className="rounded-md border border-emerald-300/40 bg-emerald-500/5 p-3 text-sm text-emerald-700"
                data-testid="admin-mineral-create-success"
              >
                {create.success}
              </div>
            ) : null}

            <button
              type="submit"
              data-testid="admin-create-mineral"
              disabled={create.loading}
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {create.loading ? "Creating…" : "Create mineral"}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}