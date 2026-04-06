"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { subscribeToAuthExpired } from "@/lib/auth/clientSessionEvents"
import type { AuthMe } from "@/lib/auth/types"
import { SessionExpiryDialog } from "@/components/auth/SessionExpiryDialog"

type RefreshMeOptions = {
  force?: boolean
}

type AuthContextValue = {
  me: AuthMe
  isLoading: boolean
  isLoggingOut: boolean
  refreshMe: (options?: RefreshMeOptions) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

const emptyMe: AuthMe = {
  isAuthenticated: false,
  user: null,
  roles: [],
  accessTokenExpiresAtEpochSeconds: null,
}

const WARNING_WINDOW_SECONDS = 120
const REFRESH_COOLDOWN_MS = 15_000

function isPublicRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/resend-verification") ||
    pathname.startsWith("/password-reset") ||
    pathname.startsWith("/shop") ||
    pathname.startsWith("/auctions") ||
    pathname.startsWith("/listing") ||
    pathname.startsWith("/order-confirmation") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout")
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = React.useState<AuthMe>(emptyMe)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const [dialogMode, setDialogMode] = React.useState<"warning" | "expired" | null>(null)
  const [dialogBusy, setDialogBusy] = React.useState(false)

  const router = useRouter()
  const pathname = usePathname()

  const routeKey = pathname

  const warningTimerRef = React.useRef<number | null>(null)
  const expiryTimerRef = React.useRef<number | null>(null)
  const inFlightRefreshRef = React.useRef<Promise<boolean> | null>(null)
  const lastRefreshAtRef = React.useRef<number>(0)
  const hadAuthenticatedSessionRef = React.useRef(false)

  const modalAllowed = React.useMemo(() => !isPublicRoute(pathname), [pathname])

  const clearTimers = React.useCallback(() => {
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }

    if (expiryTimerRef.current) {
      window.clearTimeout(expiryTimerRef.current)
      expiryTimerRef.current = null
    }
  }, [])

  const clearDialog = React.useCallback(() => {
    setDialogMode(null)
    setDialogBusy(false)
  }, [])

  const shouldShowExpiryUi = React.useCallback(() => {
    return modalAllowed && hadAuthenticatedSessionRef.current && !isLoggingOut
  }, [modalAllowed, isLoggingOut])

  const scheduleExpiryUi = React.useCallback(
    (auth: AuthMe) => {
      clearTimers()

      if (!auth.isAuthenticated || !auth.accessTokenExpiresAtEpochSeconds || !shouldShowExpiryUi()) {
        setDialogMode(null)
        return
      }

      const nowMs = Date.now()
      const expiresAtMs = auth.accessTokenExpiresAtEpochSeconds * 1000
      const warningAtMs = expiresAtMs - WARNING_WINDOW_SECONDS * 1000

      if (expiresAtMs <= nowMs) {
        setDialogMode("expired")
        return
      }

      if (warningAtMs <= nowMs) {
        setDialogMode("warning")
      } else {
        warningTimerRef.current = window.setTimeout(() => {
          setDialogMode("warning")
        }, warningAtMs - nowMs)
      }

      expiryTimerRef.current = window.setTimeout(() => {
        setDialogMode("expired")
      }, expiresAtMs - nowMs)
    },
    [clearTimers, shouldShowExpiryUi],
  )

  const refreshMe = React.useCallback(
    async (options?: RefreshMeOptions) => {
      const force = options?.force === true
      const now = Date.now()

      if (isLoggingOut) {
        return false
      }

      if (!force && inFlightRefreshRef.current) {
        return inFlightRefreshRef.current
      }

      if (!force && now - lastRefreshAtRef.current < REFRESH_COOLDOWN_MS) {
        return me.isAuthenticated
      }

      const refreshPromise = (async () => {
        setIsLoading(true)

        try {
          const res = await fetch("/api/bff/auth/me", {
            cache: "no-store",
          })

          if (!res.ok) {
            setMe(emptyMe)
            setDialogMode(shouldShowExpiryUi() ? "expired" : null)
            return false
          }

          const data = (await res.json()) as AuthMe
          setMe(data)
          if (data.isAuthenticated) {
            hadAuthenticatedSessionRef.current = true
          }
          setDialogMode(null)
          lastRefreshAtRef.current = Date.now()
          return true
        } catch {
          setMe(emptyMe)
          setDialogMode(shouldShowExpiryUi() ? "expired" : null)
          return false
        } finally {
          setIsLoading(false)
          inFlightRefreshRef.current = null
        }
      })()

      inFlightRefreshRef.current = refreshPromise
      return refreshPromise
    },
    [isLoggingOut, me.isAuthenticated, shouldShowExpiryUi],
  )

  const forceRefreshSession = React.useCallback(async () => {
    if (isLoggingOut) {
      return false
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/bff/auth/refresh", {
        method: "POST",
        cache: "no-store",
      })

      if (!res.ok) {
        setMe(emptyMe)
        setDialogMode(shouldShowExpiryUi() ? "expired" : null)
        return false
      }

      const data = (await res.json()) as AuthMe
      setMe(data)
      if (data.isAuthenticated) {
        hadAuthenticatedSessionRef.current = true
      }
      setDialogMode(null)
      lastRefreshAtRef.current = Date.now()
      return true
    } catch {
      setMe(emptyMe)
      setDialogMode(shouldShowExpiryUi() ? "expired" : null)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isLoggingOut, shouldShowExpiryUi])

  const logout = React.useCallback(async () => {
    setIsLoggingOut(true)
    clearTimers()
    clearDialog()

    await fetch("/api/bff/auth/logout", { method: "POST" }).catch(() => { })

    setMe(emptyMe)
    hadAuthenticatedSessionRef.current = false

    window.location.assign("/")
  }, [clearDialog, clearTimers])

  React.useEffect(() => {
    if (!isLoggingOut) return
    if (!isPublicRoute(pathname)) return

    setIsLoggingOut(false)
  }, [isLoggingOut, pathname])

  React.useEffect(() => {
    void refreshMe({ force: true })
  }, [refreshMe])

  React.useEffect(() => {
    void refreshMe()
  }, [routeKey, refreshMe])

  React.useEffect(() => {
    if (!shouldShowExpiryUi()) {
      setDialogMode(null)
      return
    }

    scheduleExpiryUi(me)
    return clearTimers
  }, [me, scheduleExpiryUi, clearTimers, shouldShowExpiryUi])

  React.useEffect(() => {
    return subscribeToAuthExpired(() => {
      setMe(emptyMe)
      setDialogMode(shouldShowExpiryUi() ? "expired" : null)
    })
  }, [shouldShowExpiryUi])

  const handleStaySignedIn = React.useCallback(async () => {
    setDialogBusy(true)
    const ok = await forceRefreshSession()

    if (ok) {
      clearDialog()
    } else {
      setDialogMode(shouldShowExpiryUi() ? "expired" : null)
    }

    setDialogBusy(false)
  }, [forceRefreshSession, clearDialog, shouldShowExpiryUi])

  const handleLogout = React.useCallback(async () => {
    setDialogBusy(true)
    await logout()
    setDialogBusy(false)
  }, [logout])

  const handleSignInAgain = React.useCallback(() => {
    clearDialog()
    const next = routeKey ? `?next=${encodeURIComponent(routeKey)}` : ""
    router.replace(`/login${next}`)
    router.refresh()
  }, [clearDialog, routeKey, router])

  return (
    <AuthContext.Provider value={{ me, isLoading, isLoggingOut, refreshMe, logout }}>
      {children}

      {dialogMode && shouldShowExpiryUi() ? (
        <SessionExpiryDialog
          mode={dialogMode}
          isBusy={dialogBusy}
          onStaySignedIn={dialogMode === "warning" ? handleStaySignedIn : undefined}
          onLogout={dialogMode === "warning" ? handleLogout : undefined}
          onSignInAgain={dialogMode === "expired" ? handleSignInAgain : undefined}
        />
      ) : null}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />")
  return ctx
}