"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { Container } from "@/components/site/Container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { ProxyError } from "@/lib/api/proxyError"
import type { VerifyEmailRequest, VerifyEmailResponse } from "@/lib/auth/contracts"

type ViewState =
  | { status: "loading" }
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
      setState({
        status: "error",
        message: "This verification link is missing, invalid, or expired.",
      })
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
    <Container className="py-10">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Verify your email</CardTitle>
          </CardHeader>

          <CardContent>
            {state.status === "loading" && (
              <div data-testid="verify-email-loading" className="space-y-3 text-sm">
                <div className="rounded-md border bg-muted px-3 py-2">
                  Verifying your email...
                </div>
                <div className="text-muted-foreground">
                  Please wait while we confirm your verification link.
                </div>
              </div>
            )}

            {state.status === "success" && (
              <div data-testid="verify-email-success" className="space-y-3 text-sm">
                <div className="rounded-md border bg-muted px-3 py-2">
                  <div className="font-medium">Email verified</div>
                  <div className="text-muted-foreground">
                    Your email has been verified. You can now sign in and access member features.
                  </div>
                </div>

                <div className="pt-2">
                  <Button asChild className="w-full">
                    <Link href="/login">Go to login</Link>
                  </Button>
                </div>
              </div>
            )}

            {state.status === "error" && (
              <div data-testid="verify-email-error" className="space-y-3 text-sm">
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">
                  <div className="font-medium">Verification failed</div>
                  <div className="mt-1">{state.message}</div>
                </div>

                <div className="text-muted-foreground">
                  Request a new verification email to try again.
                </div>

                <div className="flex gap-2 pt-2">
                  <Button asChild className="flex-1">
                    <Link href="/resend-verification">Resend verification</Link>
                  </Button>

                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/login">Go to login</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  )
}