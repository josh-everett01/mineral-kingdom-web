"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { getAdminCmsPages } from "@/lib/admin/cms/api"
import type { AdminCmsPageListItem } from "@/lib/admin/cms/types"

function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function badgeClass(category: string) {
  switch (category.toUpperCase()) {
    case "POLICY":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "MARKETING":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    default:
      return "border-muted bg-muted text-muted-foreground"
  }
}

export function AdminCmsPagesPage() {
  const [items, setItems] = useState<AdminCmsPageListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getAdminCmsPages()
        if (!cancelled) {
          setItems(data)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load CMS pages.")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const summaryText = useMemo(() => {
    if (isLoading) return "Loading CMS pages…"
    return `Showing ${items.length} page${items.length === 1 ? "" : "s"}`
  }, [isLoading, items.length])

  return (
    <div data-testid="admin-cms-page" className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">CMS</h1>
        <p className="text-sm text-muted-foreground">
          Manage production content pages, draft revisions, and governed publishing.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Most CMS pages should already contain production-ready content. Use this area to review what is live,
          make safe revisions, and publish intentionally.
        </p>
      </section>

      <section className="space-y-3">
        <p className="text-sm text-muted-foreground">{summaryText}</p>

        {isLoading ? (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading pages…</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            No CMS pages found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Page</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Published</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} data-testid="admin-cms-row" className="border-b last:border-b-0">
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">/{item.slug}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(item.category)}`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">{formatDate(item.publishedAt)}</td>
                      <td className="px-4 py-3 align-top">{formatDate(item.updatedAt)}</td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <Link
                          data-testid="admin-cms-open-link"
                          href={`/admin/cms/${item.slug}`}
                          className="inline-flex min-w-25 justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}