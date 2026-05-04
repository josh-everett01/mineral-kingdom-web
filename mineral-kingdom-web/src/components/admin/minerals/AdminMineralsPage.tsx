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

const adminInputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20 disabled:cursor-not-allowed disabled:opacity-60"

const adminSecondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"

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
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Admin minerals
        </p>

        <h1
          className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]"
          data-testid="admin-minerals-title"
        >
          Minerals
        </h1>

        <p
          className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text"
          data-testid="admin-minerals-description"
        >
          Minerals are catalog reference records used by listings. Listings are inventory records,
          and store offers or auctions are selling modes attached later.
        </p>
      </section>

      <section
        className="rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-5 text-sm"
        data-testid="admin-minerals-definition-notice"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <p>
            <span className="font-semibold text-[color:var(--mk-ink)]">Mineral</span>
            <span className="mk-muted-text"> = catalog term attached to a listing.</span>
          </p>
          <p>
            <span className="font-semibold text-[color:var(--mk-ink)]">Listing</span>
            <span className="mk-muted-text"> = inventory record.</span>
          </p>
          <p>
            <span className="font-semibold text-[color:var(--mk-ink)]">
              Store Offer / Auction
            </span>
            <span className="mk-muted-text"> = downstream selling mode.</span>
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="mk-glass-strong rounded-[2rem] p-5">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              Mineral library
            </h2>
            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Search existing minerals before creating a new reference record.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <label
              className="text-sm font-semibold text-[color:var(--mk-ink)]"
              htmlFor="admin-minerals-search"
            >
              Search minerals
            </label>
            <input
              id="admin-minerals-search"
              data-testid="admin-minerals-search"
              className={adminInputClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by mineral name"
            />
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-5 text-sm mk-muted-text">
                Loading minerals…
              </div>
            ) : loadError ? (
              <div
                className="rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-4 text-sm text-[color:var(--mk-danger)]"
                data-testid="admin-minerals-load-error"
              >
                {loadError}
              </div>
            ) : items.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-5 text-sm mk-muted-text"
                data-testid="admin-minerals-search-empty"
              >
                No minerals found. Create a mineral to use it in listing assignment.
              </div>
            ) : (
              <div
                className="overflow-hidden rounded-2xl border border-[color:var(--mk-border)]"
                data-testid="admin-minerals-list"
              >
                <table className="w-full text-sm">
                  <thead className="bg-[color:var(--mk-panel-muted)] text-left">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-[color:var(--mk-ink)]">
                        Name
                      </th>
                      <th className="px-4 py-3 font-semibold text-[color:var(--mk-ink)]">
                        Listings
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--mk-border)] bg-[color:var(--mk-panel)]">
                    {items.map((item) => (
                      <tr key={item.id} data-testid="admin-mineral-row">
                        <td
                          className="px-4 py-3 font-medium text-[color:var(--mk-ink)]"
                          data-testid="admin-mineral-name-value"
                        >
                          {item.name}
                        </td>
                        <td
                          className="px-4 py-3 mk-muted-text"
                          data-testid="admin-mineral-listing-count"
                        >
                          {item.listingCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="mk-glass-strong rounded-[2rem] p-5">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              Create mineral
            </h2>
            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Add a missing mineral so it can be selected in listing edit.
            </p>
          </div>

          <form className="mt-4 space-y-4" onSubmit={onCreateSubmit}>
            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-[color:var(--mk-ink)]"
                htmlFor="admin-mineral-name"
              >
                Mineral name
              </label>
              <input
                id="admin-mineral-name"
                data-testid="admin-mineral-name"
                className={adminInputClass}
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
                className="rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-4 text-sm text-[color:var(--mk-danger)]"
                data-testid="admin-mineral-create-error"
              >
                {create.error}
              </div>
            ) : null}

            {create.success ? (
              <div
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"
                data-testid="admin-mineral-create-success"
              >
                {create.success}
              </div>
            ) : null}

            <button
              type="submit"
              data-testid="admin-create-mineral"
              disabled={create.loading}
              className={adminSecondaryButtonClass}
            >
              {create.loading ? "Creating…" : "Create mineral"}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}