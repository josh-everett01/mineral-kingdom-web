"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  normalizeNotificationPreferences,
  type NotificationPreferencesDto,
  type UpdateNotificationPreferencesRequest,
} from "@/lib/account/notificationPreferencesTypes"

type LoadableError = {
  status?: number
  message?: string
  error?: string
  code?: string
}

type PreferenceKey =
  | "outbidEmailEnabled"
  | "auctionPaymentRemindersEnabled"
  | "shippingInvoiceRemindersEnabled"
  | "bidAcceptedEmailEnabled"

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesDto = {
  outbidEmailEnabled: true,
  auctionPaymentRemindersEnabled: true,
  shippingInvoiceRemindersEnabled: true,
  bidAcceptedEmailEnabled: false,
  updatedAt: null,
}

function formatDateTime(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function ToggleRow(props: {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  const { id, label, description, checked, disabled, onChange } = props

  return (
    <label
      htmlFor={id}
      className="flex items-start justify-between gap-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] p-4 transition hover:bg-[color:var(--mk-panel-muted)]"
      data-testid={`notification-preferences-row-${id}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[color:var(--mk-ink)]">{label}</p>
        <p className="mt-1 text-sm leading-6 mk-muted-text">{description}</p>
      </div>

      <input
        id={id}
        type="checkbox"
        className="mt-1 h-5 w-5 shrink-0 rounded border-[color:var(--mk-border)] accent-[color:var(--mk-amethyst)]"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        data-testid={`notification-preferences-toggle-${id}`}
      />
    </label>
  )
}

export function NotificationPreferencesClient() {
  const [preferences, setPreferences] = useState<NotificationPreferencesDto | null>(null)
  const [draft, setDraft] = useState<NotificationPreferencesDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  async function fetchPreferencesOnce() {
    const res = await fetch("/api/bff/me/notification-preferences", {
      method: "GET",
      cache: "no-store",
    })

    const body = (await res.json().catch(() => null)) as
      | NotificationPreferencesDto
      | LoadableError
      | null

    return { res, body }
  }

  useEffect(() => {
    let isMounted = true

    void (async () => {
      setIsLoading(true)
      setError(null)
      setErrorStatus(null)
      setSessionExpired(false)

      try {
        const { res, body } = await fetchPreferencesOnce()

        if (!isMounted) return

        if (res.status === 401) {
          setSessionExpired(true)
          setErrorStatus(401)
          setError("Your session expired. Please sign in again.")
          setIsLoading(false)
          return
        }

        if (res.status === 403) {
          setErrorStatus(403)
          setError("You do not have access to notification preferences.")
          setIsLoading(false)
          return
        }

        const normalized = normalizeNotificationPreferences(body)
        if (!res.ok || !normalized) {
          setErrorStatus(res.status)
          setError(
            (body && "message" in body && typeof body.message === "string" && body.message) ||
            (body && "error" in body && typeof body.error === "string" && body.error) ||
            "We couldn’t load your notification preferences.",
          )
          setIsLoading(false)
          return
        }

        setPreferences(normalized)
        setDraft(normalized)
        setIsLoading(false)
      } catch {
        if (!isMounted) return
        setErrorStatus(500)
        setError("We couldn’t load your notification preferences.")
        setIsLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [])

  function updateDraft(key: PreferenceKey, value: boolean) {
    setSaveMessage(null)

    setDraft((current) =>
      current
        ? {
          ...current,
          [key]: value,
        }
        : current,
    )
  }

  function handleRestoreDefaults() {
    setSaveMessage(null)

    setDraft((current) =>
      current
        ? {
          ...current,
          ...DEFAULT_NOTIFICATION_PREFERENCES,
        }
        : {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
        },
    )
  }

  const isDirty = useMemo(() => {
    if (!preferences || !draft) return false

    return (
      preferences.outbidEmailEnabled !== draft.outbidEmailEnabled ||
      preferences.auctionPaymentRemindersEnabled !== draft.auctionPaymentRemindersEnabled ||
      preferences.shippingInvoiceRemindersEnabled !== draft.shippingInvoiceRemindersEnabled ||
      preferences.bidAcceptedEmailEnabled !== draft.bidAcceptedEmailEnabled
    )
  }, [preferences, draft])

  async function handleSave() {
    if (!draft || isSaving || !isDirty) return

    setIsSaving(true)
    setError(null)
    setErrorStatus(null)
    setSaveMessage(null)
    setSessionExpired(false)

    const payload: UpdateNotificationPreferencesRequest = {
      outbidEmailEnabled: draft.outbidEmailEnabled,
      auctionPaymentRemindersEnabled: draft.auctionPaymentRemindersEnabled,
      shippingInvoiceRemindersEnabled: draft.shippingInvoiceRemindersEnabled,
      bidAcceptedEmailEnabled: draft.bidAcceptedEmailEnabled,
    }

    try {
      const res = await fetch("/api/bff/me/notification-preferences", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        setSessionExpired(true)
        setErrorStatus(401)
        setError("Your session expired. Please sign in again.")
        setIsSaving(false)
        return
      }

      if (res.status === 403) {
        setErrorStatus(403)
        setError("You do not have access to update notification preferences.")
        setIsSaving(false)
        return
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as LoadableError | null
        setErrorStatus(res.status)
        setError(
          (body && typeof body.message === "string" && body.message) ||
          (body && typeof body.error === "string" && body.error) ||
          "We couldn’t save your notification preferences.",
        )
        setIsSaving(false)
        return
      }

      // Backend returns 204 NoContent, so reload canonical values from GET.
      const refresh = await fetchPreferencesOnce()
      const normalized = normalizeNotificationPreferences(refresh.body)

      if (refresh.res.ok && normalized) {
        setPreferences(normalized)
        setDraft(normalized)
      } else {
        setPreferences((current) =>
          current
            ? {
              ...current,
              ...payload,
            }
            : current,
        )
        setDraft((current) =>
          current
            ? {
              ...current,
              ...payload,
            }
            : current,
        )
      }

      setSaveMessage("Your notification preferences have been updated.")
      setIsSaving(false)
    } catch {
      setError("We couldn’t save your notification preferences.")
      setErrorStatus(500)
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section
        className="mk-glass-strong rounded-[2rem] p-6"
        data-testid="notification-preferences-loading"
      >
        <p className="text-sm mk-muted-text">Loading notification preferences…</p>
      </section>
    )
  }

  if (error && !draft) {
    return (
      <section
        className="rounded-[2rem] border border-[color:var(--mk-danger)]/40 bg-[color:var(--mk-panel-muted)] p-6 shadow-sm"
        data-testid="notification-preferences-error"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-danger)]">
          Account preferences
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
          We couldn’t load your notification preferences
        </h1>
        <p className="mt-2 text-sm leading-6 text-[color:var(--mk-danger)]">{error}</p>

        <div className="mt-5 flex flex-wrap gap-3">
          {sessionExpired || errorStatus === 401 ? (
            <Link
              href="/login?returnTo=%2Faccount%2Fpreferences"
              className="mk-cta inline-flex rounded-2xl px-4 py-2 text-sm font-semibold"
              data-testid="notification-preferences-sign-in-again"
            >
              Sign in again
            </Link>
          ) : null}

          <Link
            href="/account"
            className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
            data-testid="notification-preferences-back-account"
          >
            Back to account
          </Link>
        </div>
      </section>
    )
  }

  if (!draft) {
    return null
  }

  return (
    <section className="space-y-6" data-testid="notification-preferences-page">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          Account preferences
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
          Notification preferences
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 mk-muted-text sm:text-base">
          Choose which optional auction, payment, and shipping email notifications you would like to receive.
        </p>
      </section>

      <section
        className="rounded-[2rem] border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel-muted)] p-5"
        data-testid="notification-preferences-transactional-note"
      >
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
          Transactional emails stay on
        </h2>
        <p className="mt-2 text-sm leading-6 mk-muted-text">
          Essential emails like order confirmations, payment confirmations, and required
          shipping/payment updates cannot be disabled from this page.
        </p>
      </section>

      <section
        className="mk-glass-strong space-y-3 rounded-[2rem] p-5 sm:p-6"
        data-testid="notification-preferences-toggles"
      >
        <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
          Optional email notifications
        </h2>

        <ToggleRow
          id="outbid"
          label="Outbid notifications"
          description="Get an email when another bidder outbids you on an auction you are watching."
          checked={draft.outbidEmailEnabled}
          disabled={isSaving}
          onChange={(value) => updateDraft("outbidEmailEnabled", value)}
        />

        <ToggleRow
          id="payment-reminders"
          label="Payment reminders"
          description="Get reminder emails when an auction order still needs payment."
          checked={draft.auctionPaymentRemindersEnabled}
          disabled={isSaving}
          onChange={(value) => updateDraft("auctionPaymentRemindersEnabled", value)}
        />

        <ToggleRow
          id="shipping-reminders"
          label="Shipping reminders"
          description="Get reminder emails when an Open Box shipping invoice is ready or still unpaid."
          checked={draft.shippingInvoiceRemindersEnabled}
          disabled={isSaving}
          onChange={(value) => updateDraft("shippingInvoiceRemindersEnabled", value)}
        />

        <ToggleRow
          id="bid-accepted"
          label="Bid accepted confirmations"
          description="Get an email when your bid is accepted and you become the winner."
          checked={draft.bidAcceptedEmailEnabled}
          disabled={isSaving}
          onChange={(value) => updateDraft("bidAcceptedEmailEnabled", value)}
        />
      </section>

      <section
        className="mk-glass-strong rounded-[2rem] p-5 sm:p-6"
        data-testid="notification-preferences-save-area"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm mk-muted-text">
            {preferences?.updatedAt ? (
              <p data-testid="notification-preferences-updated-at">
                Last updated {formatDateTime(preferences.updatedAt) ?? "recently"}
              </p>
            ) : (
              <p>Changes are saved only when you click Save preferences.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/account"
              className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
              data-testid="notification-preferences-back-link"
            >
              Back to account
            </Link>

            <button
              type="button"
              onClick={handleRestoreDefaults}
              disabled={isSaving}
              className="inline-flex rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="notification-preferences-restore-defaults"
            >
              Restore defaults
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="mk-cta inline-flex rounded-2xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="notification-preferences-save-button"
            >
              {isSaving ? "Saving..." : "Save preferences"}
            </button>
          </div>
        </div>

        {saveMessage ? (
          <div
            className="mt-4 rounded-2xl border border-[color:var(--mk-success)]/40 bg-[color:var(--mk-panel-muted)] px-3 py-2 text-sm text-[color:var(--mk-success)]"
            data-testid="notification-preferences-success"
          >
            {saveMessage}
          </div>
        ) : null}

        {error ? (
          <div
            className="mt-4 rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] px-3 py-2 text-sm text-[color:var(--mk-danger)]"
            data-testid="notification-preferences-save-error"
          >
            {error}
          </div>
        ) : null}
      </section>
    </section>
  )
}