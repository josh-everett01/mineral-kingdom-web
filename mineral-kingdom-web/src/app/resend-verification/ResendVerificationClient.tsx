"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { MailCheck, RefreshCcw, ShieldCheck } from "lucide-react"

import type { ProxyError } from "@/lib/api/proxyError"
import type {
  ResendVerificationRequest,
  ResendVerificationResponse,
} from "@/lib/auth/contracts"

type ViewState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const inputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20"

export default function ResendVerificationClient() {
  const search = useSearchParams()
  const [email, setEmail] = React.useState(() => search.get("email")?.trim() ?? "")
  const [emailError, setEmailError] = React.useState<string | null>(null)
  const [state, setState] = React.useState<ViewState>({ status: "idle" })

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const normalizedEmail = email.trim()

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setEmailError("Enter a valid email address.")
      return
    }

    setEmailError(null)
    setState({ status: "submitting" })

    try {
      const req: ResendVerificationRequest = { email: normalizedEmail }

      const res = await fetch("/api/bff/auth/resend-verification", {
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
          message: getErrorMessage(body, "We couldn’t process your request right now."),
        })
        return
      }

      const data = body as ResendVerificationResponse
      if (!data?.ok) {
        setState({
          status: "error",
          message: "We couldn’t process your request right now.",
        })
        return
      }

      setState({ status: "success" })
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "We couldn’t process your request right now.",
      })
    }
  }

  return (
    <main className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
            Email verification
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
            Need a fresh verification link?
          </h1>
          <p className="mt-3 text-sm leading-6 mk-muted-text sm:text-base">
            Enter your email and we’ll send another verification link if your account exists and is
            still unverified.
          </p>

          <div className="mt-5 grid gap-3">
            <RecoveryPill icon={<RefreshCcw className="h-4 w-4" />} label="Request a new link" />
            <RecoveryPill icon={<MailCheck className="h-4 w-4" />} label="Check your inbox" />
            <RecoveryPill icon={<ShieldCheck className="h-4 w-4" />} label="Unlock member access" />
          </div>
        </section>

        <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-[color:var(--mk-ink)]">
              Resend verification email
            </h2>
            <p className="mt-1 text-sm mk-muted-text">
              Use the same email address you registered with.
            </p>
          </div>

          {state.status === "success" ? (
            <div data-testid="resend-verification-success" className="space-y-4 text-sm">
              <div className="rounded-2xl border border-[color:var(--mk-success)]/40 bg-[color:var(--mk-panel-muted)] px-4 py-4">
                <div className="font-semibold text-[color:var(--mk-success)]">
                  Check your email
                </div>
                <div className="mt-1 mk-muted-text">
                  If an account exists and is unverified, we sent a new email.
                </div>
              </div>

              <Link
                href="/login"
                className="mk-cta inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99]"
              >
                Go to login
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="text-sm leading-6 mk-muted-text">
                Enter your email address and we’ll send another verification email if your account
                exists and is still unverified.
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-[color:var(--mk-ink)]">
                  Email
                </label>
                <input
                  id="email"
                  data-testid="resend-verification-email"
                  type="email"
                  autoComplete="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={emailError ? "true" : "false"}
                  aria-describedby={emailError ? "resend-verification-email-error" : undefined}
                />
                {emailError ? (
                  <div
                    id="resend-verification-email-error"
                    className="text-sm text-[color:var(--mk-danger)]"
                  >
                    {emailError}
                  </div>
                ) : null}
              </div>

              {state.status === "error" ? (
                <div
                  data-testid="resend-verification-error"
                  className="rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] px-3 py-3 text-sm text-[color:var(--mk-danger)]"
                >
                  {state.message}
                </div>
              ) : null}

              <button
                type="submit"
                data-testid="resend-verification-submit"
                className="mk-cta inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={state.status === "submitting"}
              >
                {state.status === "submitting" ? "Sending..." : "Resend verification email"}
              </button>

              <p className="text-center text-sm mk-muted-text">
                Already verified?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[color:var(--mk-ink)] underline underline-offset-4 hover:text-[color:var(--mk-gold)]"
                >
                  Sign in
                </Link>
              </p>
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