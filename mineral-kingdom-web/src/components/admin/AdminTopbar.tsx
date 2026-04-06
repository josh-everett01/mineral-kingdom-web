"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { AdminNav } from "@/components/admin/AdminNav"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type AdminTopbarProps = {
  environmentLabel: string
  roleLabel: string
  email?: string | null
}

export function AdminTopbar({ environmentLabel, roleLabel, email }: AdminTopbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header data-testid="admin-topbar" className="border-b bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Admin Console
          </p>
          <h1 className="truncate text-xl font-semibold" data-testid="admin-page-title">
            Operations dashboard
          </h1>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Badge variant="outline" data-testid="admin-environment-badge">
            Environment: {environmentLabel}
          </Badge>
          <Badge variant="secondary" data-testid="admin-role-badge">
            Role: {roleLabel}
          </Badge>
          {email ? <span className="text-sm text-muted-foreground">{email}</span> : null}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="md:hidden"
          data-testid="admin-mobile-nav-toggle"
          aria-expanded={mobileOpen}
          aria-controls="admin-mobile-nav"
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          <span className="sr-only">Toggle admin navigation</span>
        </Button>
      </div>

      <div className="border-t px-4 pb-4 md:hidden sm:px-6" data-testid="admin-mobile-meta">
        <div className="flex flex-wrap items-center gap-2 pt-3">
          <Badge variant="outline" data-testid="admin-environment-badge-mobile">
            Environment: {environmentLabel}
          </Badge>
          <Badge variant="secondary" data-testid="admin-role-badge-mobile">
            Role: {roleLabel}
          </Badge>
        </div>
        {email ? <p className="pt-2 text-sm text-muted-foreground">{email}</p> : null}
      </div>

      {mobileOpen ? (
        <div id="admin-mobile-nav" className="border-t px-4 py-4 md:hidden sm:px-6">
          <AdminNav orientation="horizontal" onNavigate={() => setMobileOpen(false)} />
        </div>
      ) : null}

      <Separator className="hidden md:block" />
    </header>
  )
}