"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { getAdminSystemSummary } from "@/lib/admin/system/api"
import type { AdminSystemSummary } from "@/lib/admin/system/types"

function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function statusTone(ok: boolean) {
  return ok
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-destructive/30 bg-destructive/10 text-destructive"
}

export function AdminSystemPage() {
  const [summary, setSummary] = useState<AdminSystemSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  async function load() {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAdminSystemSummary()
      setSummary(data)
      setLastChecked(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load system page.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- load is defined in this component, stable across renders

  const appHealthy = summary?.appHealthy ?? false
  const dbHealthy = summary?.databaseReachable ?? false

  if (isLoading) {
    return (
      <div data-testid="admin-system-page" className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Loading system status…
      </div>
    )
  }

  return (
    <div data-testid="admin-system-page" className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">System</h1>
          <p className="text-sm text-muted-foreground">
            Operational visibility for health, jobs, and webhook issues.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => void load()}
            disabled={isLoading}
            className="inline-flex rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            Refresh
          </button>
          {lastChecked ? (
            <span className="text-xs text-muted-foreground">
              Last checked {lastChecked.toLocaleTimeString()}
            </span>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <section
          data-testid="admin-system-health-card"
          className={`rounded-xl border p-5 ${statusTone(appHealthy)}`}
        >
          <h2 className="text-lg font-semibold">Application health</h2>
          <p className="mt-2 text-sm">
            Status: {appHealthy ? "healthy" : "unhealthy"}
          </p>
        </section>

        <section
          data-testid="admin-system-db-card"
          className={`rounded-xl border p-5 ${statusTone(dbHealthy)}`}
        >
          <h2 className="text-lg font-semibold">Database health</h2>
          <p className="mt-2 text-sm">
            Status: {dbHealthy ? "reachable" : "unreachable"}
          </p>
        </section>

        <section data-testid="admin-system-jobs-card" className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Jobs snapshot</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Pending</dt>
              <dd>{summary?.pendingJobs ?? 0}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Running</dt>
              <dd>{summary?.runningJobs ?? 0}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">DLQ</dt>
              <dd className={summary?.deadLetterJobs ? "text-destructive font-medium" : ""}>{summary?.deadLetterJobs ?? 0}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Failed (last 7 days)</dt>
              <dd className={summary?.recentFailedJobs ? "text-destructive font-medium" : ""}>{summary?.recentFailedJobs ?? 0}</dd>
            </div>
          </dl>
        </section>

        <section data-testid="admin-system-webhooks-card" className="rounded-xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Webhook / payment issues</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Unprocessed events</dt>
              <dd className={summary?.unprocessedWebhookEvents ? "text-destructive font-medium" : ""}>{summary?.unprocessedWebhookEvents ?? 0}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Last received</dt>
              <dd>{formatDate(summary?.lastWebhookReceivedAt ?? null)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Last processed</dt>
              <dd>{formatDate(summary?.lastWebhookProcessedAt ?? null)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div>
        <Link
          href="/admin/system/queues"
          className="inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          View queues and recent errors
        </Link>
      </div>
    </div>
  )
}