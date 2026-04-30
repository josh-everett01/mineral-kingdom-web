"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, MailCheck, ShieldAlert } from "lucide-react"

import type { ProxyError } from "@/lib/api/proxyError"
import type { VerifyEmailRequest, VerifyEmailResponse } from "@/lib/auth/contracts"

type ViewState =
  | { status: "loading" }
  | { status: "missing-token" }
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

export default function VerifyEmailClient() {
  const search = useSearchParams()
  const token = search.get("token")?.trim() ?? ""

  const attemptedRef = React.useRef(false)
  const [state, setState] = React.useState<ViewState>({ status: "loading" })

  React.useEffect(() => {
    if (attemptedRef.current) return
    attemptedRef.current = true

    if (!token) {
      setState({ status: "missing-token" })
      return
    }

    async function verify() {
      setState({ status: "loading" })

      try {
        const req: VerifyEmailRequest = { token }

        const res = await fetch("/api/bff/auth/verify-email", {
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
            message: getErrorMessage(body, "Verification failed."),
          })
          return
        }

        const data = body as VerifyEmailResponse

        if (!data?.ok) {
          setState({
            status: "error",
            message: "Verification failed.",
          })
          return
        }

        setState({ status: "success" })
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Verification failed.",
        })
      }
    }

    void verify()
  }, [token])

  return (
    <main className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
            Email verification
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
            Confirm your collector account
          </h1>
          <p className="mt-3 text-sm leading-6 mk-muted-text sm:text-base">
            Email verification helps protect bidding, checkout, order updates, and account access.
          </p>

          <div className="mt-5 grid gap-3">
            <VerifyPill icon={<MailCheck className="h-4 w-4" />} label="Verify your email" />
            <VerifyPill icon={<CheckCircle2 className="h-4 w-4" />} label="Unlock member features" />
            <VerifyPill icon={<ShieldAlert className="h-4 w-4" />} label="Protect checkout access" />
          </div>
        </section>

        <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-[color:var(--mk-ink)]">
              Verify your email
            </h2>
            <p className="mt-1 text-sm mk-muted-text">
              We’ll confirm your verification link and then send you back to sign in.
            </p>
          </div>

          {state.status === "loading" ? (
            <div data-testid="verify-email-loading" className="space-y-3 text-sm">
              <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-4 py-4">
                <div className="font-semibold text-[color:var(--mk-ink)]">
                  Verifying your email…
                </div>
                <div className="mt-1 mk-muted-text">
                  Please wait while we confirm your verification link.
                </div>
              </div>
            </div>
          ) : null}

          {state.status === "success" ? (
            <div data-testid="verify-email-success" className="space-y-4 text-sm">
              <div className="rounded-2xl border border-[color:var(--mk-success)]/40 bg-[color:var(--mk-panel-muted)] px-4 py-4">
                <div className="font-semibold text-[color:var(--mk-success)]">
                  Email verified
                </div>
                <div className="mt-1 mk-muted-text">
                  Your email has been verified. You can now sign in and access member features.
                </div>
              </div>

              <Link
                href="/login"
                className="mk-cta inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99]"
              >
                Go to login
              </Link>
            </div>
          ) : null}

          {state.status === "missing-token" ? (
            <div data-testid="verify-email-missing-token" className="space-y-4 text-sm">
              <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-4 py-4">
                <div className="font-semibold text-[color:var(--mk-ink)]">
                  Verification link needed
                </div>
                <div className="mt-1 mk-muted-text">
                  Open the verification link from your email, or request a new verification email.
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/resend-verification"
                  className="mk-cta inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold"
                >
                  Resend verification
                </Link>

                <Link
                  href="/login"
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-5 py-2.5 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
                >
                  Go to login
                </Link>
              </div>
            </div>
          ) : null}

          {state.status === "error" ? (
            <div data-testid="verify-email-error" className="space-y-4 text-sm">
              <div className="rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] px-4 py-4 text-[color:var(--mk-danger)]">
                <div className="font-semibold">Verification failed</div>
                <div className="mt-1">{state.message}</div>
              </div>

              <p className="mk-muted-text">Request a new verification email to try again.</p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/resend-verification"
                  className="mk-cta inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold"
                >
                  Resend verification
                </Link>

                <Link
                  href="/login"
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-5 py-2.5 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
                >
                  Go to login
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}

function VerifyPill({
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