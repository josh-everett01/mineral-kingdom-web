"use client"

import { Button } from "@/components/ui/button"

type Props = {
  mode: "warning" | "expired"
  isBusy?: boolean
  onStaySignedIn?: () => void
  onSignInAgain?: () => void
  onLogout?: () => void
}

export function SessionExpiryDialog({
  mode,
  isBusy = false,
  onStaySignedIn,
  onSignInAgain,
  onLogout,
}: Props) {
  const isWarning = mode === "warning"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Session status
          </p>

          <h2 className="text-2xl font-bold tracking-tight text-stone-900">
            {isWarning ? "Your session is about to expire" : "Your session expired"}
          </h2>

          <p className="text-sm text-stone-600">
            {isWarning
              ? "Stay signed in to keep working without losing your place on this page."
              : "Please sign in again to continue. We’ll bring you back to this page."}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {isWarning ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onLogout}
                disabled={isBusy}
                data-testid="session-expiry-logout"
              >
                Logout
              </Button>

              <Button
                type="button"
                onClick={onStaySignedIn}
                disabled={isBusy}
                data-testid="session-expiry-stay-signed-in"
              >
                {isBusy ? "Refreshing…" : "Stay signed in"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={onSignInAgain}
              disabled={isBusy}
              data-testid="session-expiry-sign-in-again"
            >
              Sign in again
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}