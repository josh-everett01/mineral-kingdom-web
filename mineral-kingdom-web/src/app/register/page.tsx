"use client"

import * as React from "react"
import Link from "next/link"

import type { RegisterRequest, RegisterResponse } from "@/lib/auth/contracts"
import { Container } from "@/components/site/Container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ProxyError } from "@/lib/api/proxyError"

function isProxyError(x: unknown): x is ProxyError {
  if (!x || typeof x !== "object") return false

  const rec = x as Record<string, unknown>
  return typeof rec.status === "number" && typeof rec.message === "string"
}

function isValidEmail(email: string) {
  // lightweight; backend is ultimate authority
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

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

    // Don’t call API when invalid (but keep button enabled for tests/UI)
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
        body = text // non-JSON error, etc.
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
    <Container className="py-10">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="space-y-3 text-sm">
                <div className="rounded-md border bg-muted px-3 py-2">
                  {/* Make this the ONLY element that matches /check your email/i */}
                  <div className="font-medium">Check your email</div>

                  <div className="text-muted-foreground">
                    We sent a verification link to{" "}
                    <span className="font-medium">{emailTrimmed}</span>. Verify your email before
                    bidding or paying.
                  </div>
                </div>

                {success.message && <div className="text-muted-foreground">{success.message}</div>}

                {success.nextStep && (
                  <div className="text-muted-foreground">
                    Next step: <span className="font-medium">{success.nextStep}</span>
                  </div>
                )}

                {/* Dev helper: token surfaced by backend in some environments */}
                {success.verificationToken && (
                  <div className="rounded-md border border-dashed px-3 py-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Dev verification token
                    </div>
                    <code className="mt-1 block break-all text-xs">{success.verificationToken}</code>
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <Button asChild>
                    <Link href="/login">Go to login</Link>
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Register another email
                  </Button>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                {error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />

                  {(submittedOnce || !!email) && emailMissing && (
                    <div className="text-xs text-destructive">Email is required.</div>
                  )}

                  {(submittedOnce || !!email) && !emailMissing && emailInvalid && (
                    <div className="text-xs text-destructive">Enter a valid email address.</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />

                  {(submittedOnce || !!password) && passwordMissing && (
                    <div className="text-xs text-destructive">Password is required.</div>
                  )}

                  {(submittedOnce || !!password) && !passwordMissing && passwordTooShort && (
                    <div className="text-xs text-destructive">
                      Password must be at least 8 characters.
                    </div>
                  )}
                </div>

                {/* Keep enabled so tests can click to trigger validation */}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating account..." : "Create account"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link className="underline underline-offset-4 hover:text-foreground" href="/login">
                    Sign in
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  )
}