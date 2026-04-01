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
      className="flex items-start justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4"
      data-testid={`notification-preferences-row-${id}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-stone-900">{label}</p>
        <p className="mt-1 text-sm text-stone-600">{description}</p>
      </div>

      <input
        id={id}
        type="checkbox"
        className="mt-1 h-5 w-5 shrink-0 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
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
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        data-testid="notification-preferences-loading"
      >
        <p className="text-sm text-stone-600">Loading notification preferences…</p>
      </section>
    )
  }

  if (error && !draft) {
    return (
      <section
        className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm"
        data-testid="notification-preferences-error"
      >
        <h1 className="text-2xl font-semibold text-red-900">
          We couldn’t load your notification preferences
        </h1>
        <p className="mt-2 text-sm text-red-800">{error}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          {sessionExpired || errorStatus === 401 ? (
            <Link
              href="/login?returnTo=%2Faccount%2Fpreferences"
              className="inline-flex rounded-full bg-red-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
              data-testid="notification-preferences-sign-in-again"
            >
              Sign in again
            </Link>
          ) : null}

          <Link
            href="/account"
            className="inline-flex rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 transition hover:bg-red-100"
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
    <section
      className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      data-testid="notification-preferences-page"
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Account preferences
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Notification preferences
        </h1>
        <p className="text-sm text-stone-600 sm:text-base">
          Choose which optional email notifications you would like to receive.
        </p>
      </div>

      <section
        className="rounded-2xl border border-blue-200 bg-blue-50 p-4"
        data-testid="notification-preferences-transactional-note"
      >
        <h2 className="text-lg font-semibold text-blue-950">Transactional emails stay on</h2>
        <p className="mt-2 text-sm text-blue-900">
          Essential emails like order confirmations, payment confirmations, and required
          shipping/payment updates cannot be disabled from this page.
        </p>
      </section>

      <section
        className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4"
        data-testid="notification-preferences-toggles"
      >
        <h2 className="text-lg font-semibold text-stone-900">Optional email notifications</h2>

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
        className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
        data-testid="notification-preferences-save-area"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-stone-600">
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
              className="inline-flex rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
              data-testid="notification-preferences-back-link"
            >
              Back to account
            </Link>

            <button
              type="button"
              onClick={handleRestoreDefaults}
              disabled={isSaving}
              className="inline-flex rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="notification-preferences-restore-defaults"
            >
              Restore defaults
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="notification-preferences-save-button"
            >
              {isSaving ? "Saving..." : "Save preferences"}
            </button>
          </div>
        </div>

        {saveMessage ? (
          <div
            className="mt-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
            data-testid="notification-preferences-success"
          >
            {saveMessage}
          </div>
        ) : null}

        {error ? (
          <div
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            data-testid="notification-preferences-save-error"
          >
            {error}
          </div>
        ) : null}
      </section>
    </section>
  )
}