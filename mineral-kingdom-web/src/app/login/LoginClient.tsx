"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Container } from "@/components/site/Container"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

function getSafeRedirectTarget(value: string | null | undefined) {
  if (!value) return "/dashboard?welcome=1"
  if (!value.startsWith("/")) return "/dashboard?welcome=1"
  if (value.startsWith("//")) return "/dashboard?welcome=1"
  return value
}

export default function LoginClient() {
  const search = useSearchParams()
  const redirectTarget = getSafeRedirectTarget(
    search.get("returnTo") ?? search.get("next"),
  )

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
        details?: { error?: string }
      }

      if (!res.ok || !data.ok) {
        if (data.details?.error === "EMAIL_NOT_VERIFIED") {
          setEmailNotVerified(true)
          return
        }
        const msg = data.message ?? "Login failed"
        setError(msg)
        toast.error(msg)
        return
      }

      toast.success("Welcome back")
      window.location.assign(redirectTarget)
      return
    } catch {
      const msg = "Login failed"
      setError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container className="py-12">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle data-testid="login-title">Login</CardTitle>
          <CardDescription>Sign in to your Mineral Kingdom account.</CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                data-testid="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/password-reset/request"
                  data-testid="login-forgot-password"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                data-testid="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {emailNotVerified && (
              <div
                data-testid="login-error-email-not-verified"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive space-y-1"
              >
                <div>Your email address hasn&apos;t been verified yet.</div>
                <Link
                  href={`/resend-verification?email=${encodeURIComponent(email)}`}
                  className="underline hover:no-underline"
                >
                  Resend verification email
                </Link>
              </div>
            )}

            {error && (
              <div
                data-testid="login-error"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <Button className="w-full" type="submit" data-testid="login-submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  )
}