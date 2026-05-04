"use client"

import * as React from "react"
import Link from "next/link"
import { Gem, MailCheck, ShieldCheck } from "lucide-react"

import type { RegisterRequest, RegisterResponse } from "@/lib/auth/contracts"
import type { ProxyError } from "@/lib/api/proxyError"

function isProxyError(x: unknown): x is ProxyError {
  if (!x || typeof x !== "object") return false

  const rec = x as Record<string, unknown>
  return typeof rec.status === "number" && typeof rec.message === "string"
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const inputClass =
  "w-full rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20"

const labelClass = "block text-sm font-semibold text-[color:var(--mk-ink)]"
const errorTextClass = "text-xs text-[color:var(--mk-danger)]"

export default function RegisterPage() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  const [submittedOnce, setSubmittedOnce] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<RegisterResponse | null>(null)

  const emailTrimmed = email.trim()

  const emailMissing = !emailTrimmed
  const emailInvalid = !!emailTrimmed && !isValidEmail(emailTrimmed)
  const passwordMissing = !password
  const passwordTooShort = !!password && password.length < 8

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmittedOnce(true)
    setError(null)

    if (emailMissing || emailInvalid || passwordMissing || passwordTooShort) {
      return
    }

    const req: RegisterRequest = {
      email: emailTrimmed,
      password,
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/bff/auth/register", {
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
        if (isProxyError(body)) {
          setError(body.message)
        } else if (typeof body === "string" && body.length > 0) {
          setError(body)
        } else {
          setError("Registration failed")
        }
        return
      }

      setSuccess(body as RegisterResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setSuccess(null)
    setPassword("")
    setError(null)
    setSubmittedOnce(false)
  }

  return (
    <main className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
            Join Mineral Kingdom
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
            Create your collector account
          </h1>
          <p className="mt-3 text-sm leading-6 mk-muted-text sm:text-base">
            Register to bid in auctions, manage checkout, track shipments, and keep your Open Box
            organized.
          </p>

          <div className="mt-5 grid gap-3">
            <AuthPill icon={<Gem className="h-4 w-4" />} label="Curated mineral listings" />
            <AuthPill icon={<ShieldCheck className="h-4 w-4" />} label="Secure member checkout" />
            <AuthPill icon={<MailCheck className="h-4 w-4" />} label="Email verification required" />
          </div>
        </section>

        <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
          {success ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-2xl border border-[color:var(--mk-success)]/40 bg-[color:var(--mk-panel-muted)] px-4 py-4">
                <div className="font-semibold text-[color:var(--mk-success)]">
                  Check your email
                </div>

                <div className="mt-1 mk-muted-text">
                  We sent a verification link to{" "}
                  <span className="font-semibold text-[color:var(--mk-ink)]">{emailTrimmed}</span>.
                  Verify your email before bidding or paying.
                </div>
              </div>

              {success.message ? <div className="mk-muted-text">{success.message}</div> : null}

              {success.nextStep ? (
                <div className="mk-muted-text">
                  Next step:{" "}
                  <span className="font-semibold text-[color:var(--mk-ink)]">
                    {success.nextStep}
                  </span>
                </div>
              ) : null}

              {success.verificationToken ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel-muted)] px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
                    Dev verification token
                  </div>
                  <code className="mt-1 block break-all text-xs mk-muted-text">
                    {success.verificationToken}
                  </code>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Link
                  href="/login"
                  className="mk-cta inline-flex min-h-11 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold"
                >
                  Go to login
                </Link>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-5 py-2.5 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
                >
                  Register another email
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-[color:var(--mk-ink)]">
                  Create your account
                </h2>
                <p className="mt-1 text-sm mk-muted-text">
                  Use an email you can verify before bidding or checkout.
                </p>
              </div>

              <form className="space-y-4" onSubmit={onSubmit}>
                {error ? (
                  <div className="rounded-2xl border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] px-3 py-3 text-sm text-[color:var(--mk-danger)]">
                    {error}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label className={labelClass} htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />

                  {(submittedOnce || !!email) && emailMissing ? (
                    <div className={errorTextClass}>Email is required.</div>
                  ) : null}

                  {(submittedOnce || !!email) && !emailMissing && emailInvalid ? (
                    <div className={errorTextClass}>Enter a valid email address.</div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className={labelClass} htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className={inputClass}
                  />

                  {(submittedOnce || !!password) && passwordMissing ? (
                    <div className={errorTextClass}>Password is required.</div>
                  ) : null}

                  {(submittedOnce || !!password) && !passwordMissing && passwordTooShort ? (
                    <div className={errorTextClass}>
                      Password must be at least 8 characters.
                    </div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className="mk-cta inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? "Creating account..." : "Create account"}
                </button>

                <div className="text-center text-sm mk-muted-text">
                  Already have an account?{" "}
                  <Link
                    className="font-semibold text-[color:var(--mk-ink)] underline underline-offset-4 hover:text-[color:var(--mk-gold)]"
                    href="/login"
                  >
                    Sign in
                  </Link>
                </div>
              </form>
            </>
          )}
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