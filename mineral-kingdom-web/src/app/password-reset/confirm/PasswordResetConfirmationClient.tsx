"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { Container } from "@/components/site/Container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
      : { status: "idle" }
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
      return
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error ? err.message : "We couldn’t reset your password right now.",
      })
    }
  }

  const isTokenErrorState =
    state.status === "error" && state.message === tokenErrorMessage

  const isTokenError = !token || isTokenErrorState

  return (
    <Container className="py-10">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Reset password</CardTitle>
          </CardHeader>

          <CardContent>
            {isTokenError ? (
              <div data-testid="password-reset-confirm-error" className="space-y-3 text-sm">
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
                  <div className="font-medium">Password reset failed</div>
                  <div className="mt-1">{tokenErrorMessage}</div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button asChild className="flex-1">
                    <Link href="/password-reset/request">Request reset</Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/login">Go to login</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="text-sm text-muted-foreground">
                  Enter your new password below to finish resetting your account password.
                </div>

                <div className="space-y-2">
                  <label htmlFor="newPassword" className="text-sm font-medium">
                    New password
                  </label>
                  <input
                    id="newPassword"
                    data-testid="password-reset-confirm-new-password"
                    type="password"
                    autoComplete="new-password"
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none ring-0"
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
                      className="text-sm text-destructive"
                    >
                      {newPasswordError}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    data-testid="password-reset-confirm-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none ring-0"
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
                      className="text-sm text-destructive"
                    >
                      {confirmPasswordError}
                    </div>
                  ) : null}
                </div>

                {state.status === "error" ? (
                  <div
                    data-testid="password-reset-confirm-submit-error"
                    className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {state.message}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  data-testid="password-reset-confirm-submit"
                  className="w-full"
                  disabled={state.status === "submitting"}
                >
                  {state.status === "submitting" ? "Resetting..." : "Reset password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  )
}