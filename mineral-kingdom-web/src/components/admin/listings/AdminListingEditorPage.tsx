"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  archiveAdminListing,
  getAdminListing,
  lookupAdminMinerals,
  publishAdminListing,
  updateAdminListing,
} from "@/lib/admin/listings/api"
import {
  AdminListingDetail,
  AdminListingPublishChecklist,
  AdminMineralLookupItem,
  AdminShippingRateInput,
} from "@/lib/admin/listings/types"
import { AdminListingDefinitionNotice } from "@/components/admin/listings/AdminListingDefinitionNotice"
import { AdminListingMediaSection } from "@/components/admin/listings/AdminListingMediaSection"

type Props = {
  id: string
}

type ShippingRegionForm = {
  regionCode: "US" | "CA" | "EU" | "AU" | "ROW"
  amount: string
}

type FormState = {
  title: string
  description: string
  primaryMineralId: string
  primaryMineralName: string
  localityDisplay: string
  countryCode: string
  adminArea1: string
  adminArea2: string
  mineName: string
  lengthCm: string
  widthCm: string
  heightCm: string
  weightGrams: string
  sizeClass: string
  isFluorescent: boolean
  fluorescenceNotes: string
  conditionNotes: string
  isLot: boolean
  quantityTotal: string
  quantityAvailable: string
  shippingRates: ShippingRegionForm[]
}

const SHIPPING_REGIONS: Array<{ regionCode: ShippingRegionForm["regionCode"]; label: string }> = [
  { regionCode: "US", label: "US" },
  { regionCode: "CA", label: "Canada" },
  { regionCode: "EU", label: "Europe" },
  { regionCode: "AU", label: "Australia" },
  { regionCode: "ROW", label: "Rest of World" },
]

const adminInputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20 disabled:cursor-not-allowed disabled:opacity-60"

const adminTextareaClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20 disabled:cursor-not-allowed disabled:opacity-60"

const adminSecondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"

const adminDangerButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-danger)]/40 bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-danger)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function numberOrNull(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function intOrNull(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function centsFromDollarsOrNull(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

function defaultShippingRates(): ShippingRegionForm[] {
  return SHIPPING_REGIONS.map((region) => ({
    regionCode: region.regionCode,
    amount: "",
  }))
}

function mapShippingRatesToForm(shippingRates: AdminShippingRateInput[] | undefined): ShippingRegionForm[] {
  if (!shippingRates || shippingRates.length === 0) {
    return defaultShippingRates()
  }

  return SHIPPING_REGIONS.map((region) => {
    const existing = shippingRates.find((row) => row.regionCode === region.regionCode)
    return {
      regionCode: region.regionCode,
      amount:
        typeof existing?.amountCents === "number"
          ? (existing.amountCents / 100).toString()
          : "",
    }
  })
}

function buildShippingRatePayload(rows: ShippingRegionForm[]): AdminShippingRateInput[] | null {
  const hasAnyEnteredValue = rows.some((row) => row.amount.trim().length > 0)
  if (!hasAnyEnteredValue) {
    return []
  }

  const payload: AdminShippingRateInput[] = []

  for (const region of SHIPPING_REGIONS) {
    const source = rows.find((row) => row.regionCode === region.regionCode)
    const raw = source?.amount ?? ""

    if (raw.trim() === "") {
      payload.push({
        regionCode: region.regionCode,
        amountCents: null,
      })
      continue
    }

    const cents = centsFromDollarsOrNull(raw)
    if (cents === null) {
      return null
    }

    payload.push({
      regionCode: region.regionCode,
      amountCents: cents,
    })
  }

  return payload
}

function toFormState(detail: AdminListingDetail): FormState {
  return {
    title: detail.title ?? "",
    description: detail.description ?? "",
    primaryMineralId: detail.primaryMineralId ?? "",
    primaryMineralName: detail.primaryMineralName ?? "",
    localityDisplay: detail.localityDisplay ?? "",
    countryCode: detail.countryCode ?? "",
    adminArea1: detail.adminArea1 ?? "",
    adminArea2: detail.adminArea2 ?? "",
    mineName: detail.mineName ?? "",
    lengthCm: detail.lengthCm?.toString() ?? "",
    widthCm: detail.widthCm?.toString() ?? "",
    heightCm: detail.heightCm?.toString() ?? "",
    weightGrams: detail.weightGrams?.toString() ?? "",
    sizeClass: detail.sizeClass ?? "",
    isFluorescent: detail.isFluorescent,
    fluorescenceNotes: detail.fluorescenceNotes ?? "",
    conditionNotes: detail.conditionNotes ?? "",
    isLot: detail.isLot,
    quantityTotal: detail.quantityTotal.toString(),
    quantityAvailable: detail.quantityAvailable.toString(),
    shippingRates: mapShippingRatesToForm(detail.shippingRates),
  }
}

function isArchived(status: string) {
  return status.toUpperCase() === "ARCHIVED"
}

function statusClasses(status: string) {
  switch (status.toUpperCase()) {
    case "PUBLISHED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "ARCHIVED":
      return "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] mk-muted-text"
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  }
}

function checklistLabel(code: string) {
  switch (code) {
    case "TITLE":
      return "Title is required"
    case "DESCRIPTION":
      return "Description is required"
    case "PRIMARY_MINERAL":
      return "Primary mineral is required"
    case "PRIMARY_MINERAL_INVALID":
      return "Primary mineral must be a valid mineral"
    case "IMAGE_REQUIRED":
      return "At least one ready image is required"
    case "PRIMARY_IMAGE_REQUIRED_EXACTLY_ONE":
      return "Exactly one ready primary image is required"
    case "VIDEO_CANNOT_BE_PRIMARY":
      return "A video cannot be marked as primary"
    default:
      return code
  }
}

function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function buildClientChecklist(
  form: FormState,
  detail: AdminListingDetail,
): AdminListingPublishChecklist {
  const missing: string[] = []

  if (!form.title.trim()) missing.push("TITLE")
  if (!form.description.trim()) missing.push("DESCRIPTION")
  if (!form.primaryMineralId.trim()) missing.push("PRIMARY_MINERAL")

  if (detail.mediaSummary.readyImageCount < 1) missing.push("IMAGE_REQUIRED")
  if (
    detail.mediaSummary.readyImageCount > 0 &&
    detail.mediaSummary.primaryReadyImageCount !== 1
  ) {
    missing.push("PRIMARY_IMAGE_REQUIRED_EXACTLY_ONE")
  }
  if (detail.mediaSummary.hasPrimaryVideoViolation) {
    missing.push("VIDEO_CANNOT_BE_PRIMARY")
  }

  return {
    canPublish: missing.length === 0,
    missing,
  }
}

export function AdminListingEditorPage({ id }: Props) {
  const router = useRouter()
  const [detail, setDetail] = useState<AdminListingDetail | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mineralQuery, setMineralQuery] = useState("")
  const [mineralResults, setMineralResults] = useState<AdminMineralLookupItem[]>([])
  const [isSearchingMinerals, setIsSearchingMinerals] = useState(false)
  const [isSaving, startSaveTransition] = useTransition()
  const [isPublishing, startPublishTransition] = useTransition()
  const [isArchiving, startArchiveTransition] = useTransition()
  const initialSnapshotRef = useRef<string>("")

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAdminListing(id)
      setDetail(data)
      const nextForm = toFormState(data)
      setForm(nextForm)
      initialSnapshotRef.current = JSON.stringify(nextForm)
      setMineralQuery(data.primaryMineralName ?? "")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load listing.")
    } finally {
      setIsLoading(false)
    }
  }, [id])

  const refreshDetailOnly = useCallback(async () => {
    try {
      setError(null)
      const data = await getAdminListing(id)
      setDetail(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh listing details.")
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!form) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (JSON.stringify(form) === initialSnapshotRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [form])

  useEffect(() => {
    let active = true

    async function runLookup() {
      const q = mineralQuery.trim()
      if (q.length < 2) {
        setMineralResults([])
        return
      }

      try {
        setIsSearchingMinerals(true)
        const items = await lookupAdminMinerals(q)
        if (!active) return
        setMineralResults(items)
      } catch {
        if (!active) return
        setMineralResults([])
      } finally {
        if (active) {
          setIsSearchingMinerals(false)
        }
      }
    }

    const timeout = window.setTimeout(() => {
      void runLookup()
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [mineralQuery])

  const isDirty = useMemo(() => {
    if (!form) return false
    return JSON.stringify(form) !== initialSnapshotRef.current
  }, [form])

  const archived = detail ? isArchived(detail.status) : false

  const liveChecklist = useMemo(() => {
    if (!form || !detail) return null
    return buildClientChecklist(form, detail)
  }, [form, detail])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current))
    setSuccess(null)
  }

  function setShippingAmount(regionCode: ShippingRegionForm["regionCode"], amount: string) {
    setForm((current) =>
      current
        ? {
          ...current,
          shippingRates: current.shippingRates.map((row) =>
            row.regionCode === regionCode ? { ...row, amount } : row,
          ),
        }
        : current,
    )
    setSuccess(null)
  }

  function selectMineral(item: AdminMineralLookupItem) {
    setField("primaryMineralId", item.id)
    setField("primaryMineralName", item.name)
    setMineralQuery(item.name)
    setMineralResults([])
  }

  async function handleSave() {
    if (!form || archived) return

    startSaveTransition(async () => {
      try {
        setError(null)
        setSuccess(null)

        const normalizedCountryCode = form.countryCode.trim().toUpperCase()

        if (normalizedCountryCode.length > 0 && normalizedCountryCode.length !== 2) {
          setError("Country code must be exactly 2 letters, like US or CN.")
          return
        }

        const shippingRates = buildShippingRatePayload(form.shippingRates)
        if (shippingRates === null) {
          setError("Regional shipping values must be blank or valid non-negative dollar amounts.")
          return
        }

        const payload = {
          title: emptyToNull(form.title),
          description: emptyToNull(form.description),
          primaryMineralId: emptyToNull(form.primaryMineralId),
          localityDisplay: emptyToNull(form.localityDisplay),
          countryCode: emptyToNull(normalizedCountryCode),
          adminArea1: emptyToNull(form.adminArea1),
          adminArea2: emptyToNull(form.adminArea2),
          mineName: emptyToNull(form.mineName),
          lengthCm: numberOrNull(form.lengthCm),
          widthCm: numberOrNull(form.widthCm),
          heightCm: numberOrNull(form.heightCm),
          weightGrams: intOrNull(form.weightGrams),
          sizeClass: emptyToNull(form.sizeClass)?.toUpperCase(),
          isFluorescent: form.isFluorescent,
          fluorescenceNotes: emptyToNull(form.fluorescenceNotes),
          conditionNotes: emptyToNull(form.conditionNotes),
          isLot: form.isLot,
          quantityTotal: intOrNull(form.quantityTotal),
          quantityAvailable: intOrNull(form.quantityAvailable),
          shippingRates,
        }

        await updateAdminListing(id, payload)
        await load()
        setSuccess("Listing saved.")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save listing.")
      }
    })
  }

  async function handlePublish() {
    if (!detail) return

    startPublishTransition(async () => {
      try {
        setError(null)
        setSuccess(null)
        await publishAdminListing(detail.id)
        await load()
        setSuccess("Listing published.")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to publish listing.")
      }
    })
  }

  async function handleArchive() {
    if (!detail) return

    startArchiveTransition(async () => {
      try {
        setError(null)
        setSuccess(null)
        await archiveAdminListing(detail.id)
        await load()
        setSuccess("Listing archived.")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to archive listing.")
      }
    })
  }

  if (isLoading) {
    return (
      <div
        data-testid="admin-listing-editor-loading"
        className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
      >
        Loading listing…
      </div>
    )
  }

  if (error && !detail && !form) {
    return (
      <div
        data-testid="admin-listing-editor-error"
        className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]"
      >
        {error}
      </div>
    )
  }

  if (!detail || !form) {
    return (
      <div className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text">
        Listing not found.
      </div>
    )
  }

  return (
    <div data-testid="admin-listing-editor-page" className="space-y-6">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              Admin listing editor
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
                {detail.title?.trim() || "Untitled draft"}
              </h2>

              <span
                data-testid="admin-listing-detail-status"
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                  detail.status,
                )}`}
              >
                {detail.status}
              </span>
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text">
              Manage catalog details, shipping, inventory, media, publish readiness, and lifecycle
              state for this specimen.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="admin-listing-back-to-list"
              onClick={() => router.push("/admin/listings")}
              className={adminSecondaryButtonClass}
            >
              Back to listings
            </button>

            <button
              type="button"
              data-testid="admin-listing-save"
              disabled={archived || isSaving || !isDirty}
              onClick={() => void handleSave()}
              className="mk-cta inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </section>

      <AdminListingDefinitionNotice />

      {archived ? (
        <div
          data-testid="admin-listing-archived-note"
          className="rounded-[2rem] border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-5 text-sm mk-muted-text"
        >
          Archived listings can no longer be edited.
        </div>
      ) : null}

      {isDirty ? (
        <div
          data-testid="admin-listing-unsaved"
          className="rounded-[2rem] border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-800 dark:text-amber-200"
        >
          You have unsaved changes.
        </div>
      ) : null}

      {error ? (
        <div
          data-testid="admin-listing-action-error"
          className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)]"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          data-testid="admin-listing-action-success"
          className="rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-800 dark:text-emerald-200"
        >
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h3 className="text-lg font-semibold text-[color:var(--mk-ink)]">Basic info</h3>
            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Title and description are required before publishing.
            </p>

            <div className="mt-4 grid gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Title
                </label>
                <input
                  data-testid="admin-listing-title"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  disabled={archived}
                  className={adminInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Description
                </label>
                <textarea
                  data-testid="admin-listing-description"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  disabled={archived}
                  rows={5}
                  className={adminTextareaClass}
                />
              </div>
            </div>
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h3 className="text-lg font-semibold text-[color:var(--mk-ink)]">Classification</h3>
            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Choose the primary mineral and mark special properties such as fluorescence.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Mineral
                </label>
                <input
                  data-testid="admin-listing-mineral-search"
                  value={mineralQuery}
                  onChange={(e) => {
                    setMineralQuery(e.target.value)
                    setField("primaryMineralName", e.target.value)
                    setField("primaryMineralId", "")
                  }}
                  disabled={archived}
                  placeholder="Search minerals"
                  className={adminInputClass}
                />
                <input type="hidden" value={form.primaryMineralId} />

                {isSearchingMinerals ? (
                  <div className="mt-2 text-xs mk-muted-text">Searching minerals…</div>
                ) : null}

                {!archived && mineralResults.length > 0 ? (
                  <div
                    data-testid="admin-listing-mineral-results"
                    className="mt-2 max-h-52 overflow-auto rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)]"
                  >
                    {mineralResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`admin-listing-mineral-option-${item.id}`}
                        onClick={() => selectMineral(item)}
                        className="block w-full border-b border-[color:var(--mk-border)] px-3 py-2 text-left text-sm text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] last:border-b-0"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="mt-2 text-xs mk-muted-text">
                  Selected mineral id: {form.primaryMineralId || "—"}
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm font-semibold text-[color:var(--mk-ink)]">
                <input
                  data-testid="admin-listing-is-fluorescent"
                  type="checkbox"
                  checked={form.isFluorescent}
                  onChange={(e) => setField("isFluorescent", e.target.checked)}
                  disabled={archived}
                />
                Fluorescent
              </label>
            </div>
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h3 className="text-lg font-semibold text-[color:var(--mk-ink)]">Locality</h3>
            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Public locality text helps buyers understand where the specimen is from.
            </p>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                Locality display
              </label>
              <input
                data-testid="admin-listing-locality-display"
                value={form.localityDisplay}
                onChange={(e) => setField("localityDisplay", e.target.value)}
                disabled={archived}
                className={adminInputClass}
              />
            </div>
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h3 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              Optional specimen details
            </h3>
            <p className="mt-1 text-sm leading-6 mk-muted-text">
              These fields are optional and will only appear on the public listing when filled in.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Size class
                </label>
                <input
                  data-testid="admin-listing-size-class"
                  value={form.sizeClass}
                  onChange={(e) => setField("sizeClass", e.target.value)}
                  disabled={archived}
                  placeholder="e.g. CABINET"
                  className={adminInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Country code
                </label>
                <input
                  data-testid="admin-listing-country-code"
                  value={form.countryCode}
                  onChange={(e) =>
                    setField(
                      "countryCode",
                      e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2),
                    )
                  }
                  disabled={archived}
                  placeholder="US"
                  maxLength={2}
                  className={`${adminInputClass} uppercase`}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Admin area 1
                </label>
                <input
                  data-testid="admin-listing-admin-area1"
                  value={form.adminArea1}
                  onChange={(e) => setField("adminArea1", e.target.value)}
                  disabled={archived}
                  className={adminInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Admin area 2
                </label>
                <input
                  data-testid="admin-listing-admin-area2"
                  value={form.adminArea2}
                  onChange={(e) => setField("adminArea2", e.target.value)}
                  disabled={archived}
                  className={adminInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Mine name
                </label>
                <input
                  data-testid="admin-listing-mine-name"
                  value={form.mineName}
                  onChange={(e) => setField("mineName", e.target.value)}
                  disabled={archived}
                  className={adminInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Length (cm)
                </label>
                <input
                  data-testid="admin-listing-length-cm"
                  value={form.lengthCm}
                  onChange={(e) => setField("lengthCm", e.target.value)}
                  disabled={archived}
                  inputMode="decimal"
                  className={adminInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Width (cm)
                </label>
                <input
                  data-testid="admin-listing-width-cm"
                  value={form.widthCm}
                  onChange={(e) => setField("widthCm", e.target.value)}
                  disabled={archived}
                  inputMode="decimal"
                  className={adminInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Height (cm)
                </label>
                <input
                  data-testid="admin-listing-height-cm"
                  value={form.heightCm}
                  onChange={(e) => setField("heightCm", e.target.value)}
                  disabled={archived}
                  inputMode="decimal"
                  className={adminInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Weight (g)
                </label>
                <input
                  data-testid="admin-listing-weight-grams"
                  value={form.weightGrams}
                  onChange={(e) => setField("weightGrams", e.target.value)}
                  disabled={archived}
                  inputMode="numeric"
                  className={adminInputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Fluorescence notes
                </label>
                <input
                  data-testid="admin-listing-fluorescence-notes"
                  value={form.fluorescenceNotes}
                  onChange={(e) => setField("fluorescenceNotes", e.target.value)}
                  disabled={archived}
                  className={adminInputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Condition notes
                </label>
                <textarea
                  data-testid="admin-listing-condition-notes"
                  value={form.conditionNotes}
                  onChange={(e) => setField("conditionNotes", e.target.value)}
                  disabled={archived}
                  rows={3}
                  className={adminTextareaClass}
                />
              </div>
            </div>
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h3 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              Shipping by region
            </h3>
            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Set shipping by region for this listing. Use 0 for US if shipping is included. Leave
              a region blank to show “Shipping quote available on request.”
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {SHIPPING_REGIONS.map((region) => (
                <div key={region.regionCode}>
                  <label
                    className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]"
                    htmlFor={`admin-listing-shipping-${region.regionCode}`}
                  >
                    {region.label} ($)
                  </label>
                  <input
                    id={`admin-listing-shipping-${region.regionCode}`}
                    data-testid={`admin-listing-shipping-${region.regionCode}`}
                    value={
                      form.shippingRates.find((row) => row.regionCode === region.regionCode)
                        ?.amount ?? ""
                    }
                    onChange={(e) => setShippingAmount(region.regionCode, e.target.value)}
                    disabled={archived}
                    inputMode="decimal"
                    placeholder="Blank = quote on request"
                    className={adminInputClass}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h3 className="text-lg font-semibold text-[color:var(--mk-ink)]">Inventory</h3>
            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Inventory values describe how many units exist for this catalog record. Commerce
              availability still comes from store offers, auctions, and confirmed orders.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="flex items-center gap-2 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm font-semibold text-[color:var(--mk-ink)]">
                <input
                  data-testid="admin-listing-is-lot"
                  type="checkbox"
                  checked={form.isLot}
                  onChange={(e) => setField("isLot", e.target.checked)}
                  disabled={archived}
                />
                Is lot
              </label>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Quantity total
                </label>
                <input
                  data-testid="admin-listing-quantity-total"
                  value={form.quantityTotal}
                  onChange={(e) => setField("quantityTotal", e.target.value)}
                  disabled={archived}
                  inputMode="numeric"
                  className={adminInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Quantity available
                </label>
                <input
                  data-testid="admin-listing-quantity-available"
                  value={form.quantityAvailable}
                  onChange={(e) => setField("quantityAvailable", e.target.value)}
                  disabled={archived}
                  inputMode="numeric"
                  className={adminInputClass}
                />
              </div>
            </div>
          </section>

          <AdminListingMediaSection
            listingId={detail.id}
            archived={archived}
            onChanged={async () => {
              await refreshDetailOnly()
            }}
          />
        </div>

        <aside className="space-y-6">
          <section className="mk-glass-strong rounded-[2rem] p-5">
            <h3 className="text-lg font-semibold text-[color:var(--mk-ink)]">Lifecycle</h3>
            <p className="mt-1 text-sm leading-6 mk-muted-text">
              Publish when required catalog and media fields are complete. Archive only when the
              listing should be retired from normal workflows.
            </p>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="mk-muted-text">Status</span>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                    detail.status,
                  )}`}
                >
                  {detail.status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="mk-muted-text">Updated</span>
                <span className="text-[color:var(--mk-ink)]">{formatDate(detail.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="mk-muted-text">Published</span>
                <span className="text-[color:var(--mk-ink)]">{formatDate(detail.publishedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="mk-muted-text">Archived</span>
                <span className="text-[color:var(--mk-ink)]">{formatDate(detail.archivedAt)}</span>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                type="button"
                data-testid="admin-listing-publish"
                disabled={archived || isPublishing || !detail.publishChecklist.canPublish}
                onClick={() => void handlePublish()}
                className="mk-cta w-full rounded-2xl px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPublishing ? "Publishing…" : "Publish listing"}
              </button>

              <button
                type="button"
                data-testid="admin-listing-archive"
                disabled={archived || isArchiving}
                onClick={() => void handleArchive()}
                className={`${adminDangerButtonClass} w-full`}
              >
                {isArchiving ? "Archiving…" : "Archive listing"}
              </button>
            </div>

            {!detail.publishChecklist.canPublish ? (
              <p className="mt-3 text-xs mk-muted-text">
                Fix required items before publishing.
              </p>
            ) : null}
          </section>

          <section
            data-testid="admin-listing-publish-checklist"
            className="mk-glass-strong rounded-[2rem] p-5"
          >
            <h3 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              Publish checklist
            </h3>

            <div className="mt-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm">
              <div className="font-semibold text-[color:var(--mk-ink)]">
                {liveChecklist?.canPublish ? "Ready to publish once saved" : "Live draft checklist"}
              </div>
              <div className="mt-1 leading-6 mk-muted-text">
                Checklist updates as you edit. Final publish readiness is still validated from the
                saved listing state, so save changes to refresh the publish button and backend
                checklist.
              </div>
            </div>

            <div className="mt-4">
              <ChecklistList checklist={liveChecklist ?? detail.publishChecklist} />
            </div>
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5 text-sm">
            <h3 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              Media summary
            </h3>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="mk-muted-text">Ready images</span>
                <span className="font-semibold text-[color:var(--mk-ink)]">
                  {detail.mediaSummary.readyImageCount}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="mk-muted-text">Primary ready images</span>
                <span className="font-semibold text-[color:var(--mk-ink)]">
                  {detail.mediaSummary.primaryReadyImageCount}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="mk-muted-text">Primary video violation</span>
                <span className="font-semibold text-[color:var(--mk-ink)]">
                  {detail.mediaSummary.hasPrimaryVideoViolation ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function ChecklistList({ checklist }: { checklist: AdminListingPublishChecklist }) {
  const allItems = [
    "TITLE",
    "DESCRIPTION",
    "PRIMARY_MINERAL",
    "IMAGE_REQUIRED",
    "PRIMARY_IMAGE_REQUIRED_EXACTLY_ONE",
    "VIDEO_CANNOT_BE_PRIMARY",
  ]

  const missing = new Set(checklist.missing)

  return (
    <ul className="space-y-2 text-sm">
      {allItems.map((code) => {
        const incomplete = missing.has(code)

        return (
          <li
            key={code}
            data-testid={`admin-listing-checklist-${code}`}
            className="flex items-start gap-3 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-3"
          >
            <span
              className={
                incomplete
                  ? "mt-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-500"
                  : "mt-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"
              }
            />
            <div>
              <div className="font-semibold text-[color:var(--mk-ink)]">
                {checklistLabel(code)}
              </div>
              <div className="mk-muted-text">
                {incomplete ? "Missing or invalid" : "Complete"}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}