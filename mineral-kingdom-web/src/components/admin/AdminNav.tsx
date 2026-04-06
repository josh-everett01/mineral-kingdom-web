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
              "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-foreground/20 bg-accent text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:bg-accent/60 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}