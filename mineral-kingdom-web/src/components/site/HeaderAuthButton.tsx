"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/useAuth"

export function HeaderAuthButton() {
  const { me, isLoading, logout } = useAuth()

  if (isLoading) {
    return null
  }

  if (me.isAuthenticated) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={async () => {
          await logout()
        }}
        data-testid="nav-logout"
      >
        Logout
      </Button>
    )
  }

  return (
    <Button asChild variant="outline" size="sm" data-testid="nav-login">
      <Link href="/login">Login</Link>
    </Button>
  )
}