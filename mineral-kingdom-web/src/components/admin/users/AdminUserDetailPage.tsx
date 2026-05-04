"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/auth/useAuth"
import { getAdminUser, updateAdminUserRole } from "@/lib/admin/users/api"
import type { AdminUserDetail } from "@/lib/admin/users/types"

const adminSelectClass =
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm font-medium text-[color:var(--mk-ink)]">{value}</dd>
    </div>
  )
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
      <div
        data-testid="admin-user-detail-page"
        className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
      >
        Loading user…
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
        {error}
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text">
        User not found.
      </div>
    )
  }

  return (
    <div data-testid="admin-user-detail-page" className="space-y-6">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Admin user detail
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="break-all text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
            {detail.email}
          </h1>

          <span
            data-testid="admin-user-role"
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${roleBadgeClass(detail.role)}`}
          >
            {detail.role}
          </span>

          <span className="inline-flex rounded-full border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-2.5 py-1 text-xs font-medium text-[color:var(--mk-ink)]">
            {detail.emailVerified ? "Verified" : "Not verified"}
          </span>
        </div>

        <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text">
          Review account state, role history, and privileged governance controls.
        </p>
      </section>

      <section className="rounded-[2rem] border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-800 dark:text-amber-300">
        <p className="font-semibold">Governance warning</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Granting STAFF provides access to admin operations.</li>
          <li>Changing privileged roles is a governance action.</li>
          <li>Owners cannot remove their own OWNER role.</li>
          <li>The last OWNER cannot be removed.</li>
        </ul>
      </section>

      {error ? (
        <div className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Account details</h2>

            <dl className="mt-4 grid gap-3 text-sm">
              <DetailRow label="User ID" value={detail.id} />
              <DetailRow label="Created" value={formatDate(detail.createdAt)} />
              <DetailRow label="Updated" value={formatDate(detail.updatedAt)} />
            </dl>
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Role history</h2>

            <div data-testid="admin-user-role-history" className="mt-4 space-y-3">
              {detail.roleHistory.length === 0 ? (
                <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm mk-muted-text">
                  No role history found.
                </div>
              ) : (
                detail.roleHistory.map((item, index) => (
                  <article
                    key={`${item.createdAt}-${index}`}
                    className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
                  >
                    <dl className="grid gap-3 text-sm">
                      <div>
                        <dt className="font-semibold text-[color:var(--mk-ink)]">Action</dt>
                        <dd className="mt-1 mk-muted-text">{item.actionType}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-[color:var(--mk-ink)]">Change</dt>
                        <dd className="mt-1 mk-muted-text">
                          {item.fromRole || "—"} → {item.toRole || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-[color:var(--mk-ink)]">Actor role</dt>
                        <dd className="mt-1 mk-muted-text">{item.actorRole || "—"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-[color:var(--mk-ink)]">At</dt>
                        <dd className="mt-1 mk-muted-text">{formatDate(item.createdAt)}</dd>
                      </div>
                    </dl>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Role management</h2>
            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Role changes should be intentional and reserved for trusted operational users.
            </p>

            {isOwner ? (
              <div data-testid="admin-user-role-controls" className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                    Role
                  </label>
                  <select
                    data-testid="admin-user-role-select"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    disabled={isSaving}
                    className={adminSelectClass}
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
                  className={adminSecondaryButtonClass}
                >
                  {isSaving ? "Saving…" : "Save role"}
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm mk-muted-text">
                Only OWNER users can change roles.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}