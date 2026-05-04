"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Activity, ArrowRight, Database, RefreshCcw, ServerCog } from "lucide-react"

import { getAdminSystemSummary } from "@/lib/admin/system/api"
import type { AdminSystemSummary } from "@/lib/admin/system/types"

function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function healthBadgeClass(ok: boolean) {
  return ok
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-danger)]"
}

function HealthCard({
  title,
  description,
  ok,
  statusText,
  icon,
  testId,
}: {
  title: string
  description: string
  ok: boolean
  statusText: string
  icon: React.ReactNode
  testId: string
}) {
  return (
    <section
      data-testid={testId}
      className="mk-glass-strong rounded-[2rem] p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-gold)]">
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">{title}</h2>
          <p className="mt-1 text-sm leading-6 mk-muted-text">{description}</p>

          <span
            className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${healthBadgeClass(
              ok,
            )}`}
          >
            {statusText}
          </span>
        </div>
      </div>
    </section>
  )
}

function MetricRow({
  label,
  value,
  alert,
}: {
  label: string
  value: React.ReactNode
  alert?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="mk-muted-text">{label}</dt>
      <dd className={alert ? "font-semibold text-[color:var(--mk-danger)]" : "font-semibold text-[color:var(--mk-ink)]"}>
        {value}
      </dd>
    </div>
  )
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
  }, [])

  const appHealthy = summary?.appHealthy ?? false
  const dbHealthy = summary?.databaseReachable ?? false

  if (isLoading) {
    return (
      <div
        data-testid="admin-system-page"
        className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
      >
        Loading system status…
      </div>
    )
  }

  return (
    <div data-testid="admin-system-page" className="space-y-6">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-gold)]">
              <ServerCog className="h-5 w-5" />
            </span>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
                Admin system
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
                System health
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text">
                Monitor application health, database reachability, background jobs, and webhook
                processing. Use this page as a quick operational snapshot before drilling into
                queues and recent errors.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => void load()}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </button>

            {lastChecked ? (
              <p className="mt-2 text-right text-xs mk-muted-text">
                Last checked {lastChecked.toLocaleTimeString()}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
          {error}
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <HealthCard
          testId="admin-system-health-card"
          title="Application health"
          description="Confirms the app can respond to health checks and basic runtime status requests."
          ok={appHealthy}
          statusText={appHealthy ? "Healthy" : "Unhealthy"}
          icon={<Activity className="h-5 w-5" />}
        />

        <HealthCard
          testId="admin-system-db-card"
          title="Database health"
          description="Confirms the app can reach the database used for listings, orders, payments, jobs, and CMS content."
          ok={dbHealthy}
          statusText={dbHealthy ? "Reachable" : "Unreachable"}
          icon={<Database className="h-5 w-5" />}
        />

        <section data-testid="admin-system-jobs-card" className="mk-glass-strong rounded-[2rem] p-5">
          <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Jobs snapshot</h2>
          <p className="mt-1 text-sm leading-6 mk-muted-text">
            Background jobs power async processing such as retries, notifications, and operational
            maintenance. DLQ means dead-letter queue: jobs that stopped retrying and need review.
          </p>

          <dl className="mt-4 grid gap-3 text-sm">
            <MetricRow label="Pending" value={summary?.pendingJobs ?? 0} />
            <MetricRow label="Running" value={summary?.runningJobs ?? 0} />
            <MetricRow
              label="Dead-lettered"
              value={summary?.deadLetterJobs ?? 0}
              alert={(summary?.deadLetterJobs ?? 0) > 0}
            />
            <MetricRow
              label="Failed in last 7 days"
              value={summary?.recentFailedJobs ?? 0}
              alert={(summary?.recentFailedJobs ?? 0) > 0}
            />
          </dl>
        </section>

        <section data-testid="admin-system-webhooks-card" className="mk-glass-strong rounded-[2rem] p-5">
          <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
            Webhook / payment issues
          </h2>
          <p className="mt-1 text-sm leading-6 mk-muted-text">
            Webhooks are how payment providers confirm trusted payment state. Unprocessed webhook
            events may mean order or payment finalization needs attention.
          </p>

          <dl className="mt-4 grid gap-3 text-sm">
            <MetricRow
              label="Unprocessed events"
              value={summary?.unprocessedWebhookEvents ?? 0}
              alert={(summary?.unprocessedWebhookEvents ?? 0) > 0}
            />
            <MetricRow label="Last received" value={formatDate(summary?.lastWebhookReceivedAt ?? null)} />
            <MetricRow label="Last processed" value={formatDate(summary?.lastWebhookProcessedAt ?? null)} />
          </dl>
        </section>
      </div>

      <Link
        href="/admin/system/queues"
        className="group inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
      >
        View queues and recent errors
        <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}