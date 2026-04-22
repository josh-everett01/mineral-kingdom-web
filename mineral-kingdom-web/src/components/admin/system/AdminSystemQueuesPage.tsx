"use client"

import { useEffect, useState } from "react"
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

export function AdminSystemQueuesPage() {
  const [jobs, setJobs] = useState<AdminSystemJobs | null>(null)
  const [webhooks, setWebhooks] = useState<AdminSystemWebhooks | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true)
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
      }
    }

    void load()
  }, [])

  if (isLoading) {
    return (
      <div data-testid="admin-system-queues-page" className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Loading queues…
      </div>
    )
  }

  return (
    <div data-testid="admin-system-queues-page" className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">System queues</h1>
        <p className="text-sm text-muted-foreground">
          Review job counts, recent errors, and webhook issue surfaces.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">Pending</div>
          <div data-testid="admin-system-job-count-pending" className="mt-2 text-2xl font-semibold">
            {jobs?.counts.pending ?? 0}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">Running</div>
          <div data-testid="admin-system-job-count-running" className="mt-2 text-2xl font-semibold">
            {jobs?.counts.running ?? 0}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">DLQ</div>
          <div data-testid="admin-system-job-count-dlq" className="mt-2 text-2xl font-semibold">
            {jobs?.counts.deadLetter ?? 0}
          </div>
        </section>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Recent job errors</h2>

        <div data-testid="admin-system-recent-errors">
          {!jobs || jobs.recentErrors.length === 0 ? (
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              No recent job errors.
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.recentErrors.map((job) => (
                <article key={job.id} className="rounded-lg border p-4">
                  <dl className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Type</dt>
                      <dd>{job.type}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>{job.status}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Attempts</dt>
                      <dd>
                        {job.attempts} / {job.maxAttempts}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Last error</dt>
                      <dd className="mt-1 wrap-break-word">{job.lastError || "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Updated</dt>
                      <dd>{formatDate(job.updatedAt)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Webhook issue surfaces</h2>

        <div data-testid="admin-system-webhooks" className="space-y-4">
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Unprocessed events</dt>
              <dd>{webhooks?.unprocessedCount ?? 0}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Oldest unprocessed</dt>
              <dd>{formatDate(webhooks?.oldestUnprocessedReceivedAt ?? null)}</dd>
            </div>
          </dl>

          {!webhooks || webhooks.recentEvents.length === 0 ? (
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              No recent webhook events.
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.recentEvents.map((event) => (
                <article key={`${event.provider}-${event.eventId}`} className="rounded-lg border p-4">
                  <dl className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Provider</dt>
                      <dd>{event.provider}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Event ID</dt>
                      <dd className="mt-1 break-all">{event.eventId}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Received</dt>
                      <dd>{formatDate(event.receivedAt)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Processed</dt>
                      <dd>{formatDate(event.processedAt)}</dd>
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