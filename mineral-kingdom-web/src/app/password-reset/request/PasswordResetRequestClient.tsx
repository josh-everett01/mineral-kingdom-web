"use client"

import * as React from "react"
import Link from "next/link"

import { Container } from "@/components/site/Container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { ProxyError } from "@/lib/api/proxyError"
import type {
  PasswordResetRequestRequest,
  PasswordResetRequestResponse,
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

export default function PasswordResetRequestClient() {
  const [email, setEmail] = React.useState("")
  const [emailError, setEmailError] = React.useState<string | null>(null)
  const [state, setState] = React.useState<ViewState>({ status: "idle" })

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const normalizedEmail = email.trim()

    if (!normalizedEmail) {
      setEmailError("Enter a valid email address.")
      return
    }

    if (!isValidEmail(normalizedEmail)) {
      setEmailError("Enter a valid email address.")
      return
    }

    setEmailError(null)
    setState({ status: "submitting" })

    try {
      const req: PasswordResetRequestRequest = { email: normalizedEmail }

      const res = await fetch("/api/bff/auth/password-reset/request", {
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

      const data = body as PasswordResetRequestResponse
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
    <Container className="py-10">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Password reset</CardTitle>
          </CardHeader>

          <CardContent>
            {state.status === "success" ? (
              <div data-testid="password-reset-request-success" className="space-y-3 text-sm">
                <div className="rounded-md border bg-muted px-3 py-2">
                  <div className="font-medium">Check your email</div>
                  <div className="text-muted-foreground">
                    If an account exists, we sent password reset instructions.
                  </div>
                </div>

                <div className="pt-2">
                  <Button asChild className="w-full">
                    <Link href="/login">Go to login</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="text-sm text-muted-foreground">
                  Enter your email address and we’ll send password reset instructions if an
                  account exists.
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="email"
                    data-testid="password-reset-request-email"
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none ring-0"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={emailError ? "true" : "false"}
                    aria-describedby={emailError ? "password-reset-request-email-error" : undefined}
                  />
                  {emailError ? (
                    <div
                      id="password-reset-request-email-error"
                      className="text-sm text-destructive"
                    >
                      {emailError}
                    </div>
                  ) : null}
                </div>

                {state.status === "error" ? (
                  <div
                    data-testid="password-reset-request-error"
                    className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {state.message}
                  </div>
                ) : null}

                <div className="text-center text-sm">
                  <Link href="/login" data-testid="password-reset-back-to-login" className="text-muted-foreground hover:text-foreground">
                    Back to login
                  </Link>
                </div>

                <Button
                  type="submit"
                  data-testid="password-reset-request-submit"
                  className="w-full"
                  disabled={state.status === "submitting"}
                >
                  {state.status === "submitting"
                    ? "Sending..."
                    : "Send password reset email"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  )
}