"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { useAuth } from "@/components/auth/useAuth"
import { MkStatusModal } from "@/components/site/MkStatusModal"

type ProtectedPageProps = {
  children: React.ReactNode
}

export function ProtectedPage({ children }: ProtectedPageProps) {
  const { me, isLoading, isLoggingOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    if (isLoading || isLoggingOut) return

    if (!me.isAuthenticated) {
      const returnTo = pathname ? `?returnTo=${encodeURIComponent(pathname)}` : ""
      router.replace(`/login${returnTo}`)
    }
  }, [isLoading, isLoggingOut, me.isAuthenticated, pathname, router])

  if (isLoading || isLoggingOut) {
    return (
      <MkStatusModal
        eyebrow="Session status"
        title={isLoggingOut ? "Signing you out" : "Checking your session"}
        description={
          isLoggingOut
            ? "We’re safely ending your session."
            : "We’re confirming your sign-in status before showing this page."
        }
        testId="protected-page-loading"
      />
    )
  }

  if (!me.isAuthenticated) {
    return null
  }

  return <>{children}</>
}