"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/useAuth"

type ProtectedPageProps = {
  children: React.ReactNode
  loadingFallback?: React.ReactNode
}

export function ProtectedPage({
  children,
  loadingFallback,
}: ProtectedPageProps) {
  const { me, isLoading, isLoggingOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading || isLoggingOut) return
    if (me.isAuthenticated) return

    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : ""
    router.replace(`/login${next}`)
  }, [isLoading, isLoggingOut, me.isAuthenticated, pathname, router])

  if (isLoading || isLoggingOut) {
    return (
      loadingFallback ?? (
        <section
          className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
          data-testid="protected-page-loading"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Checking your session
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
            Loading…
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            We’re confirming your account access now.
          </p>
        </section>
      )
    )
  }

  if (!me.isAuthenticated) {
    return null
  }

  return <>{children}</>
}