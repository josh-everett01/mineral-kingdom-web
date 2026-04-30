"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, LogOut, ShieldCheck, UserCircle } from "lucide-react"

import { ProtectedPage } from "@/components/auth/ProtectedPage"
import { Container } from "@/components/site/Container"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/useAuth"

function AccountContent() {
  const { me, isLoading, logout } = useAuth()
  const router = useRouter()

  async function onLogout() {
    await logout()
    router.replace("/")
    router.refresh()
  }

  return (
    <div className="space-y-6" data-testid="account-page">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              Member account
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl">
              Account
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 mk-muted-text sm:text-base">
              Review your session details, account status, and notification settings.
            </p>
          </div>

          <Button variant="secondary" onClick={onLogout} className="shrink-0" data-testid="account-logout">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </section>

      <section
        className="mk-glass-strong rounded-[2rem] p-5 sm:p-6"
        data-testid="account-session-card"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-gold)]">
            <UserCircle className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
              Session
            </h2>
            <p className="mt-1 text-sm mk-muted-text">
              Your current sign-in and account authorization status.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div
            className="mt-5 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm mk-muted-text"
            data-testid="account-loading"
          >
            Loading account session…
          </div>
        ) : (
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <AccountDetail
              label="Authenticated"
              value={me.isAuthenticated ? "Yes" : "No"}
              testId="account-authenticated-value"
            />
            <AccountDetail label="Email" value={me.user?.email ?? "—"} testId="account-email-value" />
            <AccountDetail label="User ID" value={me.user?.id ?? "—"} />
            <AccountDetail label="Roles" value={me.roles.join(", ") || "—"} />
            <AccountDetail
              label="Email verified"
              value={me.emailVerified === undefined ? "—" : me.emailVerified ? "Yes" : "No"}
            />
          </dl>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/account/preferences"
          className="mk-glass flex items-start gap-3 rounded-[2rem] p-5 transition hover:scale-[1.01]"
          data-testid="account-preferences-link"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-gold)]">
            <Bell className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-[color:var(--mk-ink)]">
              Notification preferences
            </span>
            <span className="mt-1 block text-sm leading-6 mk-muted-text">
              Choose which optional auction, payment, and shipping emails you want to receive.
            </span>
          </span>
        </Link>

        <div className="mk-glass flex items-start gap-3 rounded-[2rem] p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-gold)]">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-[color:var(--mk-ink)]">
              Secure account access
            </span>
            <span className="mt-1 block text-sm leading-6 mk-muted-text">
              Account and payment-sensitive actions are protected by your current session and role.
            </span>
          </span>
        </div>
      </section>
    </div>
  )
}

function AccountDetail({
  label,
  value,
  testId,
}: {
  label: string
  value: string
  testId?: string
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
        {label}
      </dt>
      <dd
        className="mt-1 break-all text-sm font-medium text-[color:var(--mk-ink)]"
        data-testid={testId}
      >
        {value}
      </dd>
    </div>
  )
}

export default function AccountPage() {
  return (
    <Container className="py-8 sm:py-10">
      <ProtectedPage>
        <AccountContent />
      </ProtectedPage>
    </Container>
  )
}