"use client"

import { MkStatusModal } from "@/components/site/MkStatusModal"

type SessionExpiryDialogProps = {
  mode: "warning" | "expired"
  isBusy: boolean
  onStaySignedIn?: () => void
  onLogout?: () => void
  onSignInAgain?: () => void
}

export function SessionExpiryDialog({
  mode,
  isBusy,
  onStaySignedIn,
  onLogout,
  onSignInAgain,
}: SessionExpiryDialogProps) {
  const isWarning = mode === "warning"

  return (
    <MkStatusModal
      eyebrow="Session status"
      title={isWarning ? "Your session is about to expire" : "Your session expired"}
      description={
        isWarning
          ? "Stay signed in to keep working without losing your place on this page."
          : "Please sign in again to continue using your account."
      }
      testId="session-expiry-dialog"
    >
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {isWarning && onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            disabled={isBusy}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-5 py-2.5 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="session-expiry-logout"
          >
            Sign out
          </button>
        ) : null}

        {isWarning ? (
          <button
            type="button"
            onClick={onStaySignedIn}
            disabled={isBusy || !onStaySignedIn}
            className="mk-cta inline-flex min-h-11 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="session-expiry-stay-signed-in"
          >
            {isBusy ? "Refreshing…" : "Stay signed in"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onSignInAgain}
            disabled={isBusy || !onSignInAgain}
            className="mk-cta inline-flex min-h-11 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="session-expiry-sign-in-again"
          >
            Sign in again
          </button>
        )}
      </div>
    </MkStatusModal>
  )
}