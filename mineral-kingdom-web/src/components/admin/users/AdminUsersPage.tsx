"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { getAdminUsers } from "@/lib/admin/users/api"
import type { AdminUserListItem } from "@/lib/admin/users/types"

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
      return "border-muted bg-muted text-muted-foreground"
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
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Search users, review current roles, and govern privileged access deliberately.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border bg-card p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:flex-row">
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-sm font-medium">Search by email</label>
            <input
              data-testid="admin-users-search"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              data-testid="admin-users-search-submit"
              className="inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Search
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <p className="text-sm text-muted-foreground">{summaryText}</p>

        {isLoading ? (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            Loading users…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            No users found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Verified</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      data-testid="admin-users-row"
                      className="border-b last:border-b-0"
                    >
                      <td className="px-4 py-3 align-top">{item.email}</td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${roleBadgeClass(item.role)}`}
                        >
                          {item.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {item.emailVerified ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-3 align-top">{formatDate(item.updatedAt)}</td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <Link
                          data-testid="admin-users-open-link"
                          href={`/admin/users/${item.id}`}
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