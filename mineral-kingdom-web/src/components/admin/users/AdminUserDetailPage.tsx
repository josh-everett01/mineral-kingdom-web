"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/auth/useAuth"
import { getAdminUser, updateAdminUserRole } from "@/lib/admin/users/api"
import type { AdminUserDetail } from "@/lib/admin/users/types"

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

export function AdminUserDetailPage({ userId }: { userId: string }) {
  const { me } = useAuth()
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [selectedRole, setSelectedRole] = useState("USER")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAdminUser(userId)
      setDetail(data)
      setSelectedRole(data.role)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user.")
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const roles = me?.roles ?? []
  const isOwner = roles.includes("OWNER")

  async function handleSaveRole() {
    if (!detail) return

    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      await updateAdminUserRole(detail.id, { role: selectedRole })
      await load()
      setSuccess("Role updated.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div data-testid="admin-user-detail-page" className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Loading user…
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        User not found.
      </div>
    )
  }

  return (
    <div data-testid="admin-user-detail-page" className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{detail.email}</h1>
          <span data-testid="admin-user-role" className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${roleBadgeClass(detail.role)}`}>
            {detail.role}
          </span>
          <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
            {detail.emailVerified ? "Verified" : "Not verified"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Review account state, role history, and privileged governance controls.
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
        <p className="font-medium">Governance warning</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Granting STAFF provides access to admin operations.</li>
          <li>Changing privileged roles is a governance action.</li>
          <li>Owners cannot remove their own OWNER role.</li>
          <li>The last OWNER cannot be removed.</li>
        </ul>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Account details</h2>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="font-medium">User ID</dt>
                <dd className="break-all text-muted-foreground">{detail.id}</dd>
              </div>
              <div>
                <dt className="font-medium">Created</dt>
                <dd className="text-muted-foreground">{formatDate(detail.createdAt)}</dd>
              </div>
              <div>
                <dt className="font-medium">Updated</dt>
                <dd className="text-muted-foreground">{formatDate(detail.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Role history</h2>
            <div data-testid="admin-user-role-history" className="space-y-3">
              {detail.roleHistory.length === 0 ? (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                  No role history found.
                </div>
              ) : (
                detail.roleHistory.map((item, index) => (
                  <article key={`${item.createdAt}-${index}`} className="rounded-lg border p-4">
                    <dl className="grid gap-2 text-sm">
                      <div>
                        <dt className="font-medium">Action</dt>
                        <dd className="text-muted-foreground">{item.actionType}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Change</dt>
                        <dd className="text-muted-foreground">
                          {item.fromRole || "—"} → {item.toRole || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium">Actor role</dt>
                        <dd className="text-muted-foreground">{item.actorRole || "—"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">At</dt>
                        <dd className="text-muted-foreground">{formatDate(item.createdAt)}</dd>
                      </div>
                    </dl>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Role management</h2>

            {isOwner ? (
              <div data-testid="admin-user-role-controls" className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Role</label>
                  <select
                    data-testid="admin-user-role-select"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    disabled={isSaving}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="USER">USER</option>
                    <option value="STAFF">STAFF</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                </div>

                <button
                  type="button"
                  data-testid="admin-user-role-save"
                  onClick={() => void handleSaveRole()}
                  disabled={isSaving || selectedRole === detail.role}
                  className="inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : "Save role"}
                </button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Only OWNER users can change roles.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}