"use client"

import Link from "next/link"
import { useAuth } from "@/components/auth/useAuth"

function hasAnyRole(roles: string[], allowedRoles: readonly string[]) {
  const granted = new Set(roles)
  return allowedRoles.some((role) => granted.has(role))
}

export function HeaderAuthLinks() {
  const { me, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  const isAuthenticated = me.isAuthenticated
  const canSeeDashboard = isAuthenticated
  const canSeeAdmin = hasAnyRole(me.roles, ["STAFF", "OWNER"])

  return (
    <>
      {canSeeDashboard ? (
        <Link href="/dashboard" className="hover:text-foreground" data-testid="nav-dashboard">
          Dashboard
        </Link>
      ) : null}

      {canSeeAdmin ? (
        <Link href="/admin" className="hover:text-foreground" data-testid="nav-admin">
          Admin
        </Link>
      ) : null}

      {isAuthenticated ? (
        <Link href="/account" className="hover:text-foreground" data-testid="nav-account">
          Account
        </Link>
      ) : null}
    </>
  )
}