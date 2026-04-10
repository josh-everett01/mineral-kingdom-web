"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  completeAdminMediaUpload,
  deleteAdminMedia,
  getAdminListingMedia,
  initiateAdminListingMediaUpload,
  makeAdminMediaPrimary,
} from "@/lib/admin/listings/api"
import {
  AdminInitiateListingMediaUploadResponse,
  AdminListingMediaItem,
} from "@/lib/admin/listings/types"

type Props = {
  listingId: string
  archived: boolean
  onChanged?: () => Promise<void> | void
}

type UploadQueueItem = {
  localId: string
  file: File
  fileName: string
  status: "initiating" | "uploading" | "completing" | "failed" | "done"
  progress: number
  error: string | null
}

const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
])
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
])

function classifyMediaType(file: File): "IMAGE" | "VIDEO" | null {
  if (ALLOWED_IMAGE_TYPES.has(file.type)) return "IMAGE"
  if (ALLOWED_VIDEO_TYPES.has(file.type)) return "VIDEO"
  return null
}

function validateFile(file: File): string | null {
  if (!file.name.trim()) return "File name is required."
  if (file.size <= 0) return "File is empty."
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large. Max allowed size is ${formatBytes(MAX_FILE_SIZE_BYTES)}.`
  }

  const mediaType = classifyMediaType(file)
  if (!mediaType) {
    return "Unsupported file type. Upload a supported image or video."
  }

  return null
}

function formatBytes(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—"
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function buildCacheBustedUrl(url: string, version: number) {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set("v", String(version))
    return parsed.toString()
  } catch {
    const joiner = url.includes("?") ? "&" : "?"
    return `${url}${joiner}v=${version}`
  }
}

function statusClasses(status: string) {
  switch (status.toUpperCase()) {
    case "READY":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "FAILED":
      return "border-destructive/30 bg-destructive/10 text-destructive"
    case "UPLOADING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    default:
      return "border-muted bg-muted text-muted-foreground"
  }
}

function mediaLabel(item: AdminListingMediaItem) {
  return item.originalFileName?.trim() || item.caption?.trim() || item.id
}

function uploadWithProgress(
  uploadUrl: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", uploadUrl)

    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value)
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return
      onProgress(Math.round((event.loaded / event.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Upload failed (${xhr.status}).`))
      }
    }

    xhr.onerror = () => reject(new Error("Upload failed."))
    xhr.onabort = () => reject(new Error("Upload was cancelled."))
    xhr.send(file)
  })
}

function isAuctionDeleteConflictMessage(message: string) {
  const normalized = message.toUpperCase()
  return (
    normalized.includes("MEDIA_DELETE_BLOCKED_AUCTION_ACTIVE") ||
    normalized.includes("AUCTION") ||
    normalized.includes("LIVE") ||
    normalized.includes("CLOSING") ||
    normalized.includes("ACTIVE")
  )
}

export function AdminListingMediaSection({ listingId, archived, onChanged }: Props) {
  const [items, setItems] = useState<AdminListingMediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [deleteConflict, setDeleteConflict] = useState<string | null>(null)
  const [queue, setQueue] = useState<UploadQueueItem[]>([])
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [busyPrimaryId, setBusyPrimaryId] = useState<string | null>(null)
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadMedia = useCallback(async () => {
    try {
      if (isMountedRef.current) setIsLoading(true)
      const data = await getAdminListingMedia(listingId)
      if (!isMountedRef.current) return
      setItems(data)
    } catch (e) {
      if (!isMountedRef.current) return
      setActionError(e instanceof Error ? e.message : "Failed to load listing media.")
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [listingId])

  useEffect(() => {
    void loadMedia()
  }, [loadMedia])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.createdAt.localeCompare(b.createdAt)
    })
  }, [items])

  function updateQueue(localId: string, patch: Partial<UploadQueueItem>) {
    setQueue((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...patch } : item)),
    )
  }

  async function refreshAfterMutation(successMessage?: string) {
    await loadMedia()
    if (!isMountedRef.current) return
    setRefreshVersion((v) => v + 1)
    if (successMessage) setActionSuccess(successMessage)
    await onChanged?.()
  }

  async function runUpload(queueItem: UploadQueueItem) {
    const validationError = validateFile(queueItem.file)
    if (validationError) {
      updateQueue(queueItem.localId, { status: "failed", error: validationError })
      return
    }

    const mediaType = classifyMediaType(queueItem.file)
    if (!mediaType) {
      updateQueue(queueItem.localId, {
        status: "failed",
        error: "Unsupported file type. Upload a supported image or video.",
      })
      return
    }

    try {
      setActionError(null)
      setDeleteConflict(null)
      setActionSuccess(null)

      updateQueue(queueItem.localId, {
        status: "initiating",
        progress: 0,
        error: null,
      })

      const initiate: AdminInitiateListingMediaUploadResponse =
        await initiateAdminListingMediaUpload(listingId, {
          mediaType,
          fileName: queueItem.file.name,
          contentType: queueItem.file.type || "application/octet-stream",
          contentLengthBytes: queueItem.file.size,
        })

      updateQueue(queueItem.localId, {
        status: "uploading",
        progress: 0,
      })

      await uploadWithProgress(
        initiate.uploadUrl,
        queueItem.file,
        initiate.requiredHeaders ?? {},
        (percent) => {
          updateQueue(queueItem.localId, {
            status: "uploading",
            progress: percent,
          })
        },
      )

      updateQueue(queueItem.localId, {
        status: "completing",
        progress: 100,
      })

      await completeAdminMediaUpload(initiate.mediaId, {})

      updateQueue(queueItem.localId, {
        status: "done",
        progress: 100,
        error: null,
      })

      await refreshAfterMutation("Media uploaded.")

      window.setTimeout(() => {
        if (!isMountedRef.current) return
        setQueue((current) => current.filter((item) => item.localId !== queueItem.localId))
      }, 750)
    } catch (e) {
      updateQueue(queueItem.localId, {
        status: "failed",
        error: e instanceof Error ? e.message : "Upload failed.",
      })
    }
  }

  async function handleFilesSelected(fileList: FileList | null) {
    const files = Array.from(fileList ?? [])
    if (files.length === 0 || archived) return

    setActionError(null)
    setDeleteConflict(null)
    setActionSuccess(null)

    const nextQueue = files.map<UploadQueueItem>((file) => ({
      localId: crypto.randomUUID(),
      file,
      fileName: file.name,
      status: "initiating",
      progress: 0,
      error: null,
    }))

    setQueue((current) => [...current, ...nextQueue])

    for (const item of nextQueue) {
      void runUpload(item)
    }

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleRetry(localId: string) {
    const item = queue.find((q) => q.localId === localId)
    if (!item || archived) return
    await runUpload(item)
  }

  async function handleMakePrimary(mediaId: string) {
    if (archived || busyPrimaryId || busyDeleteId) return

    try {
      setBusyPrimaryId(mediaId)
      setActionError(null)
      setDeleteConflict(null)
      setActionSuccess(null)

      await makeAdminMediaPrimary(mediaId)
      await refreshAfterMutation("Primary image updated.")
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to update primary image.")
    } finally {
      if (isMountedRef.current) setBusyPrimaryId(null)
    }
  }

  async function handleDelete(item: AdminListingMediaItem) {
    if (archived || busyDeleteId || busyPrimaryId) return

    const confirmed = window.confirm(
      "Delete this media?\n\nDeleted media may remain visible briefly because CDN/browser caches can take time to refresh.",
    )
    if (!confirmed) return

    try {
      setBusyDeleteId(item.id)
      setActionError(null)
      setDeleteConflict(null)
      setActionSuccess(null)

      await deleteAdminMedia(item.id)
      await refreshAfterMutation("Media deleted.")
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete media."
      if (isAuctionDeleteConflictMessage(message)) {
        setDeleteConflict(message)
      } else {
        setActionError(message)
      }
    } finally {
      if (isMountedRef.current) setBusyDeleteId(null)
    }
  }

  return (
    <section
      data-testid="admin-listing-media-section"
      className="rounded-xl border bg-card p-5"
    >
      <div className="mb-4">
        <h3 data-testid="admin-listing-media-title" className="text-lg font-semibold">
          Media
        </h3>
        <p
          data-testid="admin-listing-media-description"
          className="mt-2 text-sm text-muted-foreground"
        >
          Upload images or video for this listing. Images are required for publish readiness, videos
          cannot be primary, and deleted media may remain visible briefly because cached copies can
          take time to refresh.
        </p>
      </div>

      <input
        ref={fileInputRef}
        data-testid="admin-listing-media-file-input"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
        onChange={(e) => void handleFilesSelected(e.target.files)}
        className="sr-only"
        disabled={archived}
      />

      {archived ? (
        <div className="mb-4 rounded-xl border bg-muted p-4 text-sm text-muted-foreground">
          Archived listings cannot upload or change media.
        </div>
      ) : (
        <div className="mb-5 rounded-xl border border-dashed bg-muted/20 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Upload listing media</div>
              <div className="text-sm text-muted-foreground">
                Supported formats: JPG, PNG, WebP, GIF, AVIF, MP4, WebM, MOV.
              </div>
              <div className="text-xs text-muted-foreground">
                Max file size: {formatBytes(MAX_FILE_SIZE_BYTES)} per file.
              </div>
            </div>

            <button
              type="button"
              data-testid="admin-listing-media-open-picker"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Upload images or video
            </button>
          </div>
        </div>
      )}

      {actionError ? (
        <div
          data-testid="admin-listing-media-action-error"
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {actionError}
        </div>
      ) : null}

      {deleteConflict ? (
        <div
          data-testid="admin-listing-media-delete-conflict"
          className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200"
        >
          {deleteConflict}
        </div>
      ) : null}

      {actionSuccess ? (
        <div
          data-testid="admin-listing-media-action-success"
          className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200"
        >
          {actionSuccess}
        </div>
      ) : null}

      {queue.length > 0 ? (
        <div data-testid="admin-listing-media-upload-queue" className="mb-6 space-y-3">
          {queue.map((item) => (
            <div
              key={item.localId}
              data-testid="admin-listing-media-upload-item"
              className="rounded-xl border p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="truncate font-medium">{item.fileName}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.status === "initiating" && "Preparing upload…"}
                    {item.status === "uploading" && `Uploading… ${item.progress}%`}
                    {item.status === "completing" && "Completing upload…"}
                    {item.status === "failed" && (item.error || "Upload failed.")}
                    {item.status === "done" && "Upload complete."}
                  </div>
                </div>

                {item.status === "failed" && !archived ? (
                  <button
                    type="button"
                    data-testid="admin-listing-media-retry-upload"
                    onClick={() => void handleRetry(item.localId)}
                    className="inline-flex rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    Retry upload
                  </button>
                ) : null}
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  data-testid="admin-listing-media-upload-progress"
                  className="h-full rounded-full bg-foreground transition-all"
                  style={{ width: `${item.progress}%` }}
                />
              </div>

              {item.error ? (
                <div
                  data-testid="admin-listing-media-upload-error"
                  className="mt-2 text-sm text-destructive"
                >
                  {item.error}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">
          Loading media…
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="rounded-xl border bg-background px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border bg-muted/40 text-lg">
            🖼️
          </div>
          <div className="font-medium">No media yet</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Upload an image to help satisfy publish requirements and create a better listing.
          </div>
          {!archived ? (
            <button
              type="button"
              data-testid="admin-listing-media-empty-upload"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Upload first file
            </button>
          ) : null}
        </div>
      ) : (
        <div
          data-testid="admin-listing-media-grid"
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {sortedItems.map((item) => {
            const imageLike = item.mediaType.toUpperCase() === "IMAGE"
            const ready = item.status.toUpperCase() === "READY"
            const primaryBusy = busyPrimaryId === item.id
            const deleteBusy = busyDeleteId === item.id

            return (
              <article
                key={item.id}
                data-testid="admin-listing-media-item"
                className="overflow-hidden rounded-xl border bg-background"
              >
                <div className="aspect-square bg-muted">
                  {imageLike ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={buildCacheBustedUrl(item.url, refreshVersion)}
                      alt={mediaLabel(item)}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                      <div className="text-2xl">🎥</div>
                      <div>Video preview</div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      data-testid="admin-listing-media-item-status"
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>

                    {item.isPrimary ? (
                      <span
                        data-testid="admin-listing-media-item-primary-badge"
                        className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                      >
                        Primary image
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-medium">{mediaLabel(item)}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.mediaType} • {formatBytes(item.contentLengthBytes)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!archived && imageLike && ready && !item.isPrimary ? (
                      <button
                        type="button"
                        data-testid="admin-listing-media-make-primary"
                        onClick={() => void handleMakePrimary(item.id)}
                        disabled={primaryBusy || !!busyDeleteId}
                        className="inline-flex rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {primaryBusy ? "Updating…" : "Make primary"}
                      </button>
                    ) : null}

                    {!archived ? (
                      <button
                        type="button"
                        data-testid="admin-listing-media-delete"
                        onClick={() => void handleDelete(item)}
                        disabled={deleteBusy || !!busyPrimaryId}
                        className="inline-flex rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deleteBusy ? "Deleting…" : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}