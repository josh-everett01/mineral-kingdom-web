"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ADMIN_NAV_ITEMS } from "@/components/admin/admin-nav"

function isActive(pathname: string, href: string, matchMode: "exact" | "startsWith" = "startsWith") {
  if (matchMode === "exact") {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

type AdminNavProps = {
  orientation?: "vertical" | "horizontal"
  onNavigate?: () => void
}

export function AdminNav({ orientation = "vertical", onNavigate }: AdminNavProps) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Admin navigation"
      className={cn(
        "flex gap-2",
        orientation === "vertical" ? "flex-col" : "flex-col sm:flex-row sm:flex-wrap",
      )}
    >
      {ADMIN_NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href, item.matchMode)

        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={item.testId}
            data-active={active ? "true" : "false"}
            onClick={onNavigate}
            className={cn(
              "group rounded-2xl border px-3 py-2.5 text-sm font-semibold transition",
              active
                ? "border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel)] text-[color:var(--mk-ink)] shadow-sm"
                : "border-transparent text-[color:var(--mk-ink-soft)] hover:border-[color:var(--mk-border)] hover:bg-[color:var(--mk-panel-muted)] hover:text-[color:var(--mk-ink)]",
            )}
          >
            <span className="flex items-center justify-between gap-3">
              <span>{item.label}</span>
              {active ? (
                <span className="h-2 w-2 rounded-full bg-[color:var(--mk-gold)] shadow-[0_0_18px_rgb(247_185_85/0.65)]" />
              ) : null}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}