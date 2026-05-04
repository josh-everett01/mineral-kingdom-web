"use client"

import Link from "next/link"
import { FileText } from "lucide-react"
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
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
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
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-gold)]">
            <FileText className="h-5 w-5" />
          </span>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              Admin CMS
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
              CMS pages
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 mk-muted-text">
              Manage production content pages, draft revisions, and governed publishing.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
          {error}
        </section>
      ) : null}

      <section className="mk-glass-strong rounded-[2rem] p-5">
        <p className="text-sm leading-6 mk-muted-text">
          Most CMS pages should already contain production-ready content. Use this area to review
          what is live, make safe revisions, and publish intentionally.
        </p>
      </section>

      <section className="mk-glass-strong overflow-hidden rounded-[2rem]">
        <div className="border-b border-[color:var(--mk-border)] p-5">
          <p className="text-sm mk-muted-text">{summaryText}</p>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm mk-muted-text">Loading pages…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm mk-muted-text">No CMS pages found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] text-left text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
                <tr>
                  <th className="px-5 py-3">Page</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Published</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3 whitespace-nowrap">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[color:var(--mk-border)]">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    data-testid="admin-cms-row"
                    className="transition hover:bg-[color:var(--mk-panel-muted)]"
                  >
                    <td className="px-5 py-4 align-top">
                      <div className="font-semibold text-[color:var(--mk-ink)]">
                        {item.title}
                      </div>
                      <div className="text-xs mk-muted-text">/{item.slug}</div>
                    </td>

                    <td className="px-5 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(
                          item.category,
                        )}`}
                      >
                        {item.category}
                      </span>
                    </td>

                    <td className="px-5 py-4 align-top mk-muted-text">
                      {formatDate(item.publishedAt)}
                    </td>

                    <td className="px-5 py-4 align-top mk-muted-text">
                      {formatDate(item.updatedAt)}
                    </td>

                    <td className="px-5 py-4 align-top whitespace-nowrap">
                      <Link
                        data-testid="admin-cms-open-link"
                        href={`/admin/cms/${item.slug}`}
                        className="inline-flex min-w-25 justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}