"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth/useAuth"
import {
  getAdminCmsPage,
  publishAdminCmsRevision,
  saveAdminCmsDraft,
} from "@/lib/admin/cms/api"
import type { AdminCmsPageDetail, CmsRevision } from "@/lib/admin/cms/types"

const adminInputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20 disabled:cursor-not-allowed disabled:opacity-60"

const adminTextareaClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-3 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20 disabled:cursor-not-allowed disabled:opacity-60"

const adminSecondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"

function formatDate(value: string | null) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleString()
}

function categoryBadgeClass(category: string) {
  switch (category.toUpperCase()) {
    case "POLICY":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "MARKETING":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    default:
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
  }
}

function revisionBadgeClass(status: string) {
  switch (status.toUpperCase()) {
    case "PUBLISHED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "DRAFT":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    case "ARCHIVED":
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
    default:
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
  }
}

function revisionSortValue(revision: CmsRevision) {
  return new Date(
    revision.publishedAt ?? revision.effectiveAt ?? revision.createdAt,
  ).getTime()
}

function sortRevisionsNewestFirst(revisions: CmsRevision[]) {
  return [...revisions].sort((a, b) => revisionSortValue(b) - revisionSortValue(a))
}

function findLatestRevisionByStatus(revisions: CmsRevision[], status: string) {
  return (
    sortRevisionsNewestFirst(revisions).find(
      (revision) => revision.status.toUpperCase() === status.toUpperCase(),
    ) ?? null
  )
}

function findLatestEditableRevision(revisions: CmsRevision[]) {
  const latestDraft = findLatestRevisionByStatus(revisions, "DRAFT")
  if (latestDraft) return latestDraft

  const latestPublished = findLatestRevisionByStatus(revisions, "PUBLISHED")
  if (latestPublished) return latestPublished

  return sortRevisionsNewestFirst(revisions)[0] ?? null
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function applyInlineMarkdown(text: string) {
  return text
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
}

function renderSimpleMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")
  const parts: string[] = []
  let paragraph: string[] = []
  let inUl = false
  let inOl = false

  function flushParagraph() {
    if (paragraph.length > 0) {
      parts.push(`<p>${applyInlineMarkdown(paragraph.join(" "))}</p>`)
      paragraph = []
    }
  }

  function closeLists() {
    if (inUl) {
      parts.push("</ul>")
      inUl = false
    }

    if (inOl) {
      parts.push("</ol>")
      inOl = false
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      closeLists()
      continue
    }

    const headingMatch = /^(#{1,4})\s+(.*)$/.exec(line)
    if (headingMatch) {
      flushParagraph()
      closeLists()

      const level = headingMatch[1].length
      parts.push(`<h${level}>${applyInlineMarkdown(headingMatch[2])}</h${level}>`)
      continue
    }

    const ulMatch = /^[-*]\s+(.*)$/.exec(line)
    if (ulMatch) {
      flushParagraph()

      if (inOl) {
        parts.push("</ol>")
        inOl = false
      }

      if (!inUl) {
        parts.push("<ul>")
        inUl = true
      }

      parts.push(`<li>${applyInlineMarkdown(ulMatch[1])}</li>`)
      continue
    }

    const olMatch = /^\d+\.\s+(.*)$/.exec(line)
    if (olMatch) {
      flushParagraph()

      if (inUl) {
        parts.push("</ul>")
        inUl = false
      }

      if (!inOl) {
        parts.push("<ol>")
        inOl = true
      }

      parts.push(`<li>${applyInlineMarkdown(olMatch[1])}</li>`)
      continue
    }

    closeLists()
    paragraph.push(line)
  }

  flushParagraph()
  closeLists()

  return parts.join("")
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-[color:var(--mk-ink)]">
        {value}
      </div>
    </div>
  )
}

export function AdminCmsEditorPage({ slug }: { slug: string }) {
  const { me } = useAuth()
  const [detail, setDetail] = useState<AdminCmsPageDetail | null>(null)
  const [markdown, setMarkdown] = useState("")
  const [changeSummary, setChangeSummary] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await getAdminCmsPage(slug)
      setDetail(data)

      const latestEditable = findLatestEditableRevision(data.revisions)
      setMarkdown(latestEditable?.contentMarkdown ?? "")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load CMS page.")
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void load()
  }, [load])

  const roles = me?.roles ?? []
  const isOwner = roles.includes("OWNER")
  const isStaff = roles.includes("STAFF")
  const category = detail?.category?.toUpperCase() ?? ""
  const canEdit = !!detail && (category === "MARKETING" ? isOwner || isStaff : isOwner)
  const canPublish = canEdit

  const latestDraft = useMemo(
    () => (detail ? findLatestRevisionByStatus(detail.revisions, "DRAFT") : null),
    [detail],
  )

  const latestPublished = useMemo(
    () => (detail ? findLatestRevisionByStatus(detail.revisions, "PUBLISHED") : null),
    [detail],
  )

  const previewHtml = useMemo(() => {
    const safeMarkdown = escapeHtml(markdown)
    return renderSimpleMarkdown(safeMarkdown)
  }, [markdown])

  async function handleSaveDraft() {
    if (!detail) return

    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      await saveAdminCmsDraft(detail.slug, {
        contentMarkdown: markdown,
        changeSummary: changeSummary.trim() || null,
      })

      await load()
      setSuccess("Draft saved.")
      setChangeSummary("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save draft.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePublish() {
    if (!detail) return

    try {
      setIsPublishing(true)
      setError(null)
      setSuccess(null)

      let revisionId = latestDraft?.id

      if (!revisionId) {
        const draftResponse = await saveAdminCmsDraft(detail.slug, {
          contentMarkdown: markdown,
          changeSummary: changeSummary.trim() || null,
        })
        revisionId = draftResponse.revisionId
      }

      await publishAdminCmsRevision(detail.slug, {
        revisionId,
        effectiveAt: null,
      })

      await load()
      setSuccess("Revision published.")
      setChangeSummary("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish revision.")
    } finally {
      setIsPublishing(false)
    }
  }

  if (isLoading) {
    return (
      <div
        data-testid="admin-cms-detail-page"
        className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
      >
        Loading CMS page…
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
        Page not found.
      </div>
    )
  }

  return (
    <div data-testid="admin-cms-detail-page" className="space-y-6">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              Admin CMS
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
                {detail.title}
              </h1>

              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${categoryBadgeClass(
                  detail.category,
                )}`}
              >
                {detail.category}
              </span>
            </div>

            <p className="mt-2 break-all text-xs mk-muted-text">/{detail.slug}</p>

            <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text">
              Manage published site content with draft revisions, preview, and controlled publishing.
              Policy pages are restricted to OWNER users.
            </p>
          </div>

          <Link
            href={`/${detail.slug}`}
            target="_blank"
            className={adminSecondaryButtonClass}
          >
            View public page
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <StatCard
            label="Latest published"
            value={formatDate(latestPublished?.publishedAt ?? null)}
          />
          <StatCard
            label="Latest draft"
            value={formatDate(latestDraft?.createdAt ?? null)}
          />
          <StatCard label="Last updated" value={formatDate(detail.updatedAt)} />
        </div>
      </section>

      {!canEdit ? (
        <div className="rounded-[2rem] border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-6 text-amber-800 dark:text-amber-300">
          {detail.category.toUpperCase() === "POLICY"
            ? "This is a POLICY page. Only OWNER users can save drafts or publish revisions."
            : "You do not have permission to edit this page."}
        </div>
      ) : null}

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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="mk-glass-strong rounded-[2rem] p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
                  Markdown editor
                </h2>
                <p className="mt-1 text-sm leading-6 mk-muted-text">
                  Save revisions as drafts first. Public content changes only after publish.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Change summary
                </label>
                <input
                  data-testid="admin-cms-change-summary"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  disabled={!canEdit || isSaving || isPublishing}
                  placeholder="Briefly describe this revision"
                  className={adminInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Markdown
                </label>
                <textarea
                  data-testid="admin-cms-markdown"
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  disabled={!canEdit || isSaving || isPublishing}
                  rows={22}
                  className={`${adminTextareaClass} min-h-125 font-mono`}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="admin-cms-save-draft"
                  disabled={!canEdit || isSaving || isPublishing || !markdown.trim()}
                  onClick={() => void handleSaveDraft()}
                  className={adminSecondaryButtonClass}
                >
                  {isSaving ? "Saving…" : "Save draft"}
                </button>

                <button
                  type="button"
                  data-testid="admin-cms-publish"
                  disabled={!canPublish || isSaving || isPublishing || !markdown.trim()}
                  onClick={() => void handlePublish()}
                  className="mk-cta inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPublishing ? "Publishing…" : "Publish latest draft"}
                </button>
              </div>
            </div>
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
                Rendered preview
              </h2>
              <p className="mt-1 text-sm leading-6 mk-muted-text">
                Preview updates live from the current markdown in the editor.
              </p>
            </div>

            {previewHtml ? (
              <article
                data-testid="admin-cms-preview"
                className="cms-content rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] p-5"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-5 text-sm mk-muted-text">
                No preview is available yet.
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              Revision history
            </h2>

            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Review prior drafts and published revisions before making public changes.
            </p>

            <div data-testid="admin-cms-revision-history" className="mt-4 space-y-3">
              {detail.revisions.length === 0 ? (
                <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm mk-muted-text">
                  No revisions found.
                </div>
              ) : (
                sortRevisionsNewestFirst(detail.revisions).map((revision) => (
                  <article
                    key={revision.id}
                    data-testid="admin-cms-revision-row"
                    className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${revisionBadgeClass(
                          revision.status,
                        )}`}
                      >
                        {revision.status}
                      </span>

                      <span className="text-xs mk-muted-text">
                        {formatDate(revision.createdAt)}
                      </span>
                    </div>

                    <dl className="mt-3 grid gap-3 text-sm">
                      <div>
                        <dt className="font-semibold text-[color:var(--mk-ink)]">
                          Change summary
                        </dt>
                        <dd className="mt-1 mk-muted-text">
                          {revision.changeSummary || "—"}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-semibold text-[color:var(--mk-ink)]">
                          Editor
                        </dt>
                        <dd className="mt-1 break-all mk-muted-text">
                          {revision.editorUserId}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-semibold text-[color:var(--mk-ink)]">
                          Publisher
                        </dt>
                        <dd className="mt-1 break-all mk-muted-text">
                          {revision.publishedByUserId || "—"}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-semibold text-[color:var(--mk-ink)]">
                          Published at
                        </dt>
                        <dd className="mt-1 mk-muted-text">
                          {formatDate(revision.publishedAt)}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-semibold text-[color:var(--mk-ink)]">
                          Effective at
                        </dt>
                        <dd className="mt-1 mk-muted-text">
                          {formatDate(revision.effectiveAt)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}