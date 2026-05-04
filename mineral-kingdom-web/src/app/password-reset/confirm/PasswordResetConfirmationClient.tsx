"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react"

import type { ProxyError } from "@/lib/api/proxyError"
import type {
  PasswordResetConfirmRequest,
  PasswordResetConfirmResponse,
} from "@/lib/auth/contracts"

type ViewState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string }

function isProxyError(x: unknown): x is ProxyError {
  if (!x || typeof x !== "object") return false
  const rec = x as Record<string, unknown>
  return typeof rec.status === "number" && typeof rec.message === "string"
}

function getErrorMessage(body: unknown, fallback: string) {
  if (isProxyError(body)) return body.message
  if (typeof body === "string" && body.length > 0) return body
  return fallback
}

const inputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20"

export default function PasswordResetConfirmClient() {
  const search = useSearchParams()
  const token = search.get("token")?.trim() ?? ""
  const tokenErrorMessage = "This password reset link is missing, invalid, or expired."

  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [newPasswordError, setNewPasswordError] = React.useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = React.useState<string | null>(null)
  const [state, setState] = React.useState<ViewState>(
    !token
      ? {
        status: "error",
        message: tokenErrorMessage,
      }
      : { status: "idle" },
  )

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!token) {
      setState({
        status: "error",
        message: tokenErrorMessage,
      })
      return
    }

    const normalizedPassword = newPassword.trim()
    const normalizedConfirm = confirmPassword.trim()

    let hasError = false

    if (!normalizedPassword || normalizedPassword.length < 8) {
      setNewPasswordError("Password must be at least 8 characters.")
      hasError = true
    } else {
      setNewPasswordError(null)
    }

    if (!normalizedConfirm) {
      setConfirmPasswordError("Please confirm your new password.")
      hasError = true
    } else if (normalizedPassword !== normalizedConfirm) {
      setConfirmPasswordError("Passwords do not match.")
      hasError = true
    } else {
      setConfirmPasswordError(null)
    }

    if (hasError) return

    setState({ status: "submitting" })

    try {
      const req: PasswordResetConfirmRequest = {
        token,
        newPassword: normalizedPassword,
      }

      const res = await fetch("/api/bff/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
      })

      const text = await res.text()
      let body: unknown = null

      try {
        body = text ? (JSON.parse(text) as unknown) : null
      } catch {
        body = text
      }

      if (!res.ok) {
        setState({
          status: "error",
          message: getErrorMessage(body, "We couldn’t reset your password right now."),
        })
        return
      }

      const data = body as PasswordResetConfirmResponse
      if (!data?.ok) {
        setState({
          status: "error",
          message: "We couldn’t reset your password right now.",
        })
        return
      }

      window.location.assign("/login")
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "We couldn’t reset your password right now.",
      })
    }
  }

  const isTokenErrorState = state.status === "error" && state.message === tokenErrorMessage
  const isTokenError = !token || isTokenErrorState

  return (
    <main className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
            Password reset
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
            Create a new password
          </h1>
          <p className="mt-3 text-sm leading-6 mk-muted-text sm:text-base">
            Finish resetting your Mineral Kingdom account with a new secure password.
          </p>

          <div className="mt-5 grid gap-3">
            <RecoveryPill icon={<KeyRound className="h-4 w-4" />} label="Use your reset link" />
            <RecoveryPill icon={<LockKeyhole className="h-4 w-4" />} label="Choose 8+ characters" />
            <RecoveryPill icon={<ShieldCheck className="h-4 w-4" />} label="Return to secure login" />
          </div>
        </section>

        <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-[color:var(--mk-ink)]">
              Reset password
            </h2>
            <p className="mt-1 text-sm mk-muted-text">
              Enter your new password below to finish resetting your account password.
            </p>
          </div>

          {isTokenError ? (
            <div data-testid="password-reset-confirm-error" className="space-y-4 text-sm">
              <div className="rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] px-4 py-4 text-[color:var(--mk-danger)]">
                <div className="font-semibold">Password reset failed</div>
                <div className="mt-1">{tokenErrorMessage}</div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/password-reset/request"
                  className="mk-cta inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold"
                >
                  Request reset
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-5 py-2.5 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
                >
                  Go to login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <label htmlFor="newPassword" className="block text-sm font-semibold text-[color:var(--mk-ink)]">
                  New password
                </label>
                <input
                  id="newPassword"
                  data-testid="password-reset-confirm-new-password"
                  type="password"
                  autoComplete="new-password"
                  className={inputClass}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  aria-invalid={newPasswordError ? "true" : "false"}
                  aria-describedby={
                    newPasswordError ? "password-reset-confirm-new-password-error" : undefined
                  }
                />
                {newPasswordError ? (
                  <div
                    id="password-reset-confirm-new-password-error"
                    className="text-sm text-[color:var(--mk-danger)]"
                  >
                    {newPasswordError}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  data-testid="password-reset-confirm-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  className={inputClass}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  aria-invalid={confirmPasswordError ? "true" : "false"}
                  aria-describedby={
                    confirmPasswordError
                      ? "password-reset-confirm-confirm-password-error"
                      : undefined
                  }
                />
                {confirmPasswordError ? (
                  <div
                    id="password-reset-confirm-confirm-password-error"
                    className="text-sm text-[color:var(--mk-danger)]"
                  >
                    {confirmPasswordError}
                  </div>
                ) : null}
              </div>

              {state.status === "error" ? (
                <div
                  data-testid="password-reset-confirm-submit-error"
                  className="rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] px-3 py-3 text-sm text-[color:var(--mk-danger)]"
                >
                  {state.message}
                </div>
              ) : null}

              <button
                type="submit"
                data-testid="password-reset-confirm-submit"
                className="mk-cta inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={state.status === "submitting"}
              >
                {state.status === "submitting" ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}

function RecoveryPill({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="mk-glass flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium">
      <span className="text-[color:var(--mk-gold)]">{icon}</span>
      <span>{label}</span>
    </div>
  )
}