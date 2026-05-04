"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, RefreshCcw } from "lucide-react"
import Link from "next/link"

import {
  getAdminSystemJobs,
  getAdminSystemWebhooks,
} from "@/lib/admin/system/api"
import type {
  AdminSystemJobs,
  AdminSystemWebhooks,
} from "@/lib/admin/system/types"

function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function countClass(value?: number | null) {
  return value && value > 0 ? "text-[color:var(--mk-danger)]" : "text-[color:var(--mk-ink)]"
}

function QueueCountCard({
  label,
  value,
  helper,
  alert,
  testId,
}: {
  label: string
  value: number
  helper: string
  alert?: boolean
  testId: string
}) {
  return (
    <section className="mk-glass-strong rounded-[2rem] p-5">
      <p className="text-sm mk-muted-text">{label}</p>
      <p
        data-testid={testId}
        className={`mt-2 text-3xl font-semibold tracking-tight ${alert ? "text-[color:var(--mk-danger)]" : "text-[color:var(--mk-ink)]"
          }`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 mk-muted-text">{helper}</p>
    </section>
  )
}

export function AdminSystemQueuesPage() {
  const [jobs, setJobs] = useState<AdminSystemJobs | null>(null)
  const [webhooks, setWebhooks] = useState<AdminSystemWebhooks | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(options?: { background?: boolean }) {
    try {
      if (options?.background) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setError(null)

      const [jobsData, webhooksData] = await Promise.all([
        getAdminSystemJobs(),
        getAdminSystemWebhooks(),
      ])

      setJobs(jobsData)
      setWebhooks(webhooksData)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load queues page.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (isLoading) {
    return (
      <div
        data-testid="admin-system-queues-page"
        className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
      >
        Loading queues…
      </div>
    )
  }

  return (
    <div data-testid="admin-system-queues-page" className="space-y-6">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              Admin system
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
              Queues and recent errors
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text">
              Review background job failures and webhook processing issues. Use this page when the
              dashboard shows dead-lettered jobs, recent job failures, or payment webhook events
              waiting to process.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/admin/system"
              className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              System
            </Link>

            <button
              type="button"
              onClick={() => void load({ background: true })}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]">
          {error}
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <QueueCountCard
          label="Pending jobs"
          value={jobs?.counts.pending ?? 0}
          helper="Jobs waiting to be picked up by the background worker."
          testId="admin-system-job-count-pending"
        />

        <QueueCountCard
          label="Running jobs"
          value={jobs?.counts.running ?? 0}
          helper="Jobs currently being processed."
          testId="admin-system-job-count-running"
        />

        <QueueCountCard
          label="Dead-lettered jobs"
          value={jobs?.counts.deadLetter ?? 0}
          helper="Jobs that exhausted retries and need admin or developer review."
          alert={(jobs?.counts.deadLetter ?? 0) > 0}
          testId="admin-system-job-count-dlq"
        />
      </div>

      <section className="mk-glass-strong rounded-[2rem] p-5">
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">Recent job errors</h2>
        <p className="mt-1 text-sm leading-6 mk-muted-text">
          These are the most recent failed jobs. A repeated type or the same last error usually
          points to a workflow bug, missing handler, bad data, or integration issue.
        </p>

        <div data-testid="admin-system-recent-errors" className="mt-4">
          {!jobs || jobs.recentErrors.length === 0 ? (
            <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm mk-muted-text">
              No recent job errors.
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.recentErrors.map((job) => (
                <article
                  key={job.id}
                  className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
                >
                  <dl className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="mk-muted-text">Type</dt>
                      <dd className="font-semibold text-[color:var(--mk-ink)]">{job.type}</dd>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <dt className="mk-muted-text">Status</dt>
                      <dd className="font-semibold text-[color:var(--mk-ink)]">{job.status}</dd>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <dt className="mk-muted-text">Attempts</dt>
                      <dd className="font-semibold text-[color:var(--mk-ink)]">
                        {job.attempts} / {job.maxAttempts}
                      </dd>
                    </div>

                    <div>
                      <dt className="mk-muted-text">Last error</dt>
                      <dd className="mt-1 break-words text-sm text-[color:var(--mk-ink)]">
                        {job.lastError || "—"}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <dt className="mk-muted-text">Updated</dt>
                      <dd className="text-[color:var(--mk-ink)]">{formatDate(job.updatedAt)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mk-glass-strong rounded-[2rem] p-5">
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
          Webhook issue surfaces
        </h2>
        <p className="mt-1 text-sm leading-6 mk-muted-text">
          Payment providers use webhooks to confirm trusted payment state. Unprocessed events can
          explain delayed order confirmation, delayed shipping invoice confirmation, or payment
          status mismatches.
        </p>

        <div data-testid="admin-system-webhooks" className="mt-4 space-y-4">
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="mk-muted-text">Unprocessed events</dt>
              <dd className={`font-semibold ${countClass(webhooks?.unprocessedCount ?? 0)}`}>
                {webhooks?.unprocessedCount ?? 0}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="mk-muted-text">Oldest unprocessed</dt>
              <dd className="text-[color:var(--mk-ink)]">
                {formatDate(webhooks?.oldestUnprocessedReceivedAt ?? null)}
              </dd>
            </div>
          </dl>

          {!webhooks || webhooks.recentEvents.length === 0 ? (
            <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm mk-muted-text">
              No recent webhook events.
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.recentEvents.map((event) => (
                <article
                  key={`${event.provider}-${event.eventId}`}
                  className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
                >
                  <dl className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="mk-muted-text">Provider</dt>
                      <dd className="font-semibold text-[color:var(--mk-ink)]">{event.provider}</dd>
                    </div>

                    <div>
                      <dt className="mk-muted-text">Event ID</dt>
                      <dd className="mt-1 break-all text-xs text-[color:var(--mk-ink)]">
                        {event.eventId}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <dt className="mk-muted-text">Received</dt>
                      <dd className="text-[color:var(--mk-ink)]">{formatDate(event.receivedAt)}</dd>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <dt className="mk-muted-text">Processed</dt>
                      <dd className="text-[color:var(--mk-ink)]">{formatDate(event.processedAt)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}