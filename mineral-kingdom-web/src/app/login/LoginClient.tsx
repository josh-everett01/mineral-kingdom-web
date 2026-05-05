"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

function getSafeRedirectTarget(value: string | null | undefined) {
  if (!value) return "/dashboard?welcome=1"
  if (!value.startsWith("/")) return "/dashboard?welcome=1"
  if (value.startsWith("//")) return "/dashboard?welcome=1"
  return value
}

const inputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20"

const labelClass = "block text-sm font-semibold text-[color:var(--mk-ink)]"

function friendlyLoginMessage(status: number, code?: string, message?: string) {
  switch (code) {
    case "INVALID_CREDENTIALS":
      return "The email or password you entered is incorrect."
    case "INVALID_INPUT":
      return "Enter both email and password."
    case "TOO_MANY_ATTEMPTS":
      return "Too many sign-in attempts. Please wait a moment and try again."
    case "UPSTREAM_UNAVAILABLE":
      return "We couldn't reach the sign-in service. Please try again."
    default:
      if (status === 401) return "The email or password you entered is incorrect."
      if (status === 429) return "Too many sign-in attempts. Please wait a moment and try again."
      if (status >= 500) return "We couldn't reach the sign-in service. Please try again."
      return message ?? "Sign-in failed. Please try again."
  }
}

export default function LoginClient() {
  const search = useSearchParams()
  const redirectTarget = getSafeRedirectTarget(search.get("returnTo") ?? search.get("next"))

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [emailNotVerified, setEmailNotVerified] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setEmailNotVerified(false)

    try {
      const res = await fetch("/api/bff/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = (await res.json()) as {
        ok: boolean
        message?: string
        code?: string
        details?: { error?: string; code?: string }
      }
      const errorCode = data.code ?? data.details?.error ?? data.details?.code

      if (!res.ok || !data.ok) {
        if (errorCode === "EMAIL_NOT_VERIFIED") {
          setEmailNotVerified(true)
          return
        }

        const msg = friendlyLoginMessage(res.status, errorCode, data.message)
        setError(msg)
        toast.error(msg)
        return
      }

      toast.success("Welcome back")
      window.location.assign(redirectTarget)
    } catch {
      const msg = "Login failed"
      setError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
            Member access
          </p>
          <h1
            className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl"
            data-testid="login-title"
          >
            Sign in to Mineral Kingdom
          </h1>
          <p className="mt-3 text-sm leading-6 mk-muted-text sm:text-base">
            Access your dashboard, bids, orders, Open Box shipments, and support tickets.
          </p>

          <div className="mt-5 grid gap-3">
            <AuthPill icon={<ShieldCheck className="h-4 w-4" />} label="Secure checkout access" />
            <AuthPill icon={<LockKeyhole className="h-4 w-4" />} label="Member bidding tools" />
            <AuthPill icon={<Mail className="h-4 w-4" />} label="Order and shipping updates" />
          </div>
        </section>

        <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-[color:var(--mk-ink)]">Welcome back</h2>
            <p className="mt-1 text-sm mk-muted-text">
              Sign in to continue to your Mineral Kingdom account.
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className={labelClass} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                data-testid="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className={labelClass} htmlFor="password">
                  Password
                </label>
                <Link
                  href="/password-reset/request"
                  data-testid="login-forgot-password"
                  className="text-sm font-semibold mk-muted-text underline-offset-4 hover:text-[color:var(--mk-ink)] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                data-testid="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            {emailNotVerified ? (
              <div
                data-testid="login-error-email-not-verified"
                className="space-y-1 rounded-2xl border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel-muted)] px-3 py-3 text-sm mk-muted-text"
              >
                <div className="font-semibold text-[color:var(--mk-ink)]">
                  Your email address hasn&apos;t been verified yet.
                </div>
                <Link
                  href={`/resend-verification?email=${encodeURIComponent(email)}`}
                  className="font-semibold text-[color:var(--mk-gold)] underline underline-offset-4 hover:no-underline"
                >
                  Resend verification email
                </Link>
              </div>
            ) : null}

            {error ? (
              <div
                data-testid="login-error"
                className="rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] px-3 py-3 text-sm text-[color:var(--mk-danger)]"
              >
                {error}
              </div>
            ) : null}

            <button
              className="mk-cta inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              data-testid="login-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>

            <p className="text-center text-sm mk-muted-text">
              Need an account?{" "}
              <Link
                className="font-semibold text-[color:var(--mk-ink)] underline underline-offset-4 hover:text-[color:var(--mk-gold)]"
                href="/register"
              >
                Create one
              </Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  )
}

function AuthPill({
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
