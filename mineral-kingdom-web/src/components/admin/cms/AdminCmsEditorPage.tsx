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
      return "border-muted bg-muted text-muted-foreground"
  }
}

function revisionBadgeClass(status: string) {
  switch (status.toUpperCase()) {
    case "PUBLISHED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "DRAFT":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    case "ARCHIVED":
      return "border-muted bg-muted text-muted-foreground"
    default:
      return "border-muted bg-muted text-muted-foreground"
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
  return sortRevisionsNewestFirst(revisions).find(
    (revision) => revision.status.toUpperCase() === status.toUpperCase(),
  ) ?? null
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
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
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
  const canEdit = !!detail && (category === "MARKETING" ? (isOwner || isStaff) : isOwner)
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
      <div data-testid="admin-cms-detail-page" className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Loading CMS page…
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
        Page not found.
      </div>
    )
  }

  return (
    <div data-testid="admin-cms-detail-page" className="space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{detail.title}</h1>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${categoryBadgeClass(detail.category)}`}>
                {detail.category}
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">/{detail.slug}</p>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Manage existing published content, save safe draft revisions, and publish changes according to governance rules.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${detail.slug}`}
              target="_blank"
              className="inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              View public page
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-background p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Latest published</div>
            <div className="mt-2 text-sm font-medium">{formatDate(latestPublished?.publishedAt ?? null)}</div>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Latest draft</div>
            <div className="mt-2 text-sm font-medium">{formatDate(latestDraft?.createdAt ?? null)}</div>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last updated</div>
            <div className="mt-2 text-sm font-medium">{formatDate(detail.updatedAt)}</div>
          </div>
        </div>
      </div>

      {!canEdit ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
          {detail.category.toUpperCase() === "POLICY"
            ? "This is a POLICY page. Only OWNER users can save drafts or publish revisions."
            : "You do not have permission to edit this page."}
        </div>
      ) : null}

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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Markdown editor</h2>
                <p className="text-sm text-muted-foreground">
                  Save revisions as drafts first. Public content changes only after publish.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Change summary</label>
                <input
                  data-testid="admin-cms-change-summary"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  disabled={!canEdit || isSaving || isPublishing}
                  placeholder="Briefly describe this revision"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Markdown</label>
                <textarea
                  data-testid="admin-cms-markdown"
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  disabled={!canEdit || isSaving || isPublishing}
                  rows={22}
                  className="min-h-125 w-full rounded-xl border bg-background px-3 py-3 font-mono text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="admin-cms-save-draft"
                  disabled={!canEdit || isSaving || isPublishing || !markdown.trim()}
                  onClick={() => void handleSaveDraft()}
                  className="inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : "Save draft"}
                </button>

                <button
                  type="button"
                  data-testid="admin-cms-publish"
                  disabled={!canPublish || isSaving || isPublishing || !markdown.trim()}
                  onClick={() => void handlePublish()}
                  className="inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPublishing ? "Publishing…" : "Publish latest draft"}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Rendered preview</h2>
              <p className="text-sm text-muted-foreground">
                Preview updates live from the current markdown in the editor.
              </p>
            </div>

            {previewHtml ? (
              <article
                data-testid="admin-cms-preview"
                className="cms-content rounded-xl border bg-background p-5"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div className="rounded-xl border bg-background p-5 text-sm text-muted-foreground">
                No preview is available yet.
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Revision history</h2>
            <div data-testid="admin-cms-revision-history" className="space-y-3">
              {detail.revisions.length === 0 ? (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                  No revisions found.
                </div>
              ) : (
                sortRevisionsNewestFirst(detail.revisions).map((revision) => (
                  <article
                    key={revision.id}
                    data-testid="admin-cms-revision-row"
                    className="rounded-xl border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${revisionBadgeClass(revision.status)}`}>
                        {revision.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(revision.createdAt)}
                      </span>
                    </div>

                    <dl className="mt-3 grid gap-2 text-sm">
                      <div>
                        <dt className="font-medium">Change summary</dt>
                        <dd className="text-muted-foreground">{revision.changeSummary || "—"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Editor</dt>
                        <dd className="break-all text-muted-foreground">{revision.editorUserId}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Publisher</dt>
                        <dd className="break-all text-muted-foreground">{revision.publishedByUserId || "—"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Published at</dt>
                        <dd className="text-muted-foreground">{formatDate(revision.publishedAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Effective at</dt>
                        <dd className="text-muted-foreground">{formatDate(revision.effectiveAt)}</dd>
                      </div>
                    </dl>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}