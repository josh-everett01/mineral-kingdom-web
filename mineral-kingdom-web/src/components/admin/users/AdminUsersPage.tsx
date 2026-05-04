"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { getAdminUsers } from "@/lib/admin/users/api"
import type { AdminUserListItem } from "@/lib/admin/users/types"

const adminInputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20 disabled:cursor-not-allowed disabled:opacity-60"

const adminSecondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function roleBadgeClass(role: string) {
  switch (role.toUpperCase()) {
    case "OWNER":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "STAFF":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    default:
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
  }
}

export function AdminUsersPage() {
  const [email, setEmail] = useState("")
  const [items, setItems] = useState<AdminUserListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  async function load(searchEmail: string) {
    const requestId = ++requestIdRef.current

    try {
      setIsLoading(true)
      setError(null)

      const data = await getAdminUsers({ email: searchEmail })

      if (requestId !== requestIdRef.current) {
        return
      }

      setItems(data)
    } catch (e) {
      if (requestId !== requestIdRef.current) {
        return
      }

      setError(e instanceof Error ? e.message : "Failed to load users.")
      setItems([])
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    void load("")
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const submittedEmail = String(formData.get("email") ?? "").trim()

    setEmail(submittedEmail)
    await load(submittedEmail)
  }

  const summaryText = useMemo(() => {
    if (isLoading) return "Loading users…"
    return `Showing ${items.length} user${items.length === 1 ? "" : "s"}`
  }, [isLoading, items.length])

  return (
    <div data-testid="admin-users-page" className="space-y-6">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Admin users
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
          Users
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text">
          Search users, review current roles, and govern privileged access deliberately.
        </p>
      </section>

      {error ? (
        <div className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
          {error}
        </div>
      ) : null}

      <section className="mk-glass-strong rounded-[2rem] p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:flex-row">
          <div className="min-w-0 flex-1">
            <label
              className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]"
              htmlFor="admin-users-search"
            >
              Search by email
            </label>
            <input
              id="admin-users-search"
              data-testid="admin-users-search"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className={adminInputClass}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              data-testid="admin-users-search-submit"
              className={adminSecondaryButtonClass}
            >
              Search
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <p className="text-sm mk-muted-text">{summaryText}</p>

        {isLoading ? (
          <div className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text">
            Loading users…
          </div>
        ) : items.length === 0 ? (
          <div className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text">
            No users found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-[color:var(--mk-ink)]">Email</th>
                    <th className="px-4 py-3 font-semibold text-[color:var(--mk-ink)]">Role</th>
                    <th className="px-4 py-3 font-semibold text-[color:var(--mk-ink)]">
                      Verified
                    </th>
                    <th className="px-4 py-3 font-semibold text-[color:var(--mk-ink)]">
                      Updated
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold text-[color:var(--mk-ink)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--mk-border)]">
                  {items.map((item) => (
                    <tr key={item.id} data-testid="admin-users-row">
                      <td className="px-4 py-3 align-top font-medium text-[color:var(--mk-ink)]">
                        {item.email}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${roleBadgeClass(item.role)}`}
                        >
                          {item.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top mk-muted-text">
                        {item.emailVerified ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-3 align-top mk-muted-text">
                        {formatDate(item.updatedAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        <Link
                          data-testid="admin-users-open-link"
                          href={`/admin/users/${item.id}`}
                          className="inline-flex min-w-25 justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
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