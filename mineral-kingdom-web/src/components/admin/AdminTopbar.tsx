"use client"

import { useState } from "react"
import { Menu, ShieldCheck, X } from "lucide-react"
import { AdminNav } from "@/components/admin/AdminNav"
import { Button } from "@/components/ui/button"

type AdminTopbarProps = {
  environmentLabel: string
  roleLabel: string
  email?: string | null
}

export function AdminTopbar({ environmentLabel, roleLabel, email }: AdminTopbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header
      data-testid="admin-topbar"
      className="sticky top-0 z-30 border-b border-[color:var(--mk-border)] bg-[rgb(var(--mk-page-rgb)/0.88)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
            Admin Console
          </p>
          <h1
            className="truncate text-xl font-semibold tracking-tight text-[color:var(--mk-ink)]"
            data-testid="admin-page-title"
          >
            Operations dashboard
          </h1>
        </div>

        <div className="hidden min-w-0 items-center gap-2 md:flex">
          <AdminMetaPill label="Environment" value={environmentLabel} testId="admin-environment-badge" />
          <AdminMetaPill label="Role" value={roleLabel} testId="admin-role-badge" />

          {email ? (
            <span className="max-w-64 truncate text-sm mk-muted-text" title={email}>
              {email}
            </span>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-2xl border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] text-[color:var(--mk-ink)] md:hidden"
          data-testid="admin-mobile-nav-toggle"
          aria-expanded={mobileOpen}
          aria-controls="admin-mobile-nav"
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          <span className="sr-only">Toggle admin navigation</span>
        </Button>
      </div>

      <div className="border-t border-[color:var(--mk-border)] px-4 pb-4 md:hidden sm:px-6">
        <div className="flex flex-wrap items-center gap-2 pt-3" data-testid="admin-mobile-meta">
          <AdminMetaPill
            label="Environment"
            value={environmentLabel}
            testId="admin-environment-badge-mobile"
          />
          <AdminMetaPill label="Role" value={roleLabel} testId="admin-role-badge-mobile" />
        </div>

        {email ? (
          <p className="pt-2 text-sm mk-muted-text">
            Signed in as <span className="font-medium text-[color:var(--mk-ink)]">{email}</span>
          </p>
        ) : null}
      </div>

      {mobileOpen ? (
        <div
          id="admin-mobile-nav"
          className="border-t border-[color:var(--mk-border)] px-4 py-4 md:hidden sm:px-6"
        >
          <AdminNav orientation="horizontal" onNavigate={() => setMobileOpen(false)} />
        </div>
      ) : null}
    </header>
  )
}

function AdminMetaPill({
  label,
  value,
  testId,
}: {
  label: string
  value: string
  testId: string
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-3 py-1.5 text-xs font-semibold text-[color:var(--mk-ink)]"
      data-testid={testId}
    >
      <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--mk-gold)]" />
      <span className="mk-muted-text">{label}:</span>
      <span>{value}</span>
    </span>
  )
}