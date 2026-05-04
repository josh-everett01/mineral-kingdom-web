"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { LogOut, Menu } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/useAuth"

const THEME_MENU_OPEN_EVENT = "mk:theme-menu-open"

function hasAnyRole(roles: string[], allowedRoles: readonly string[]) {
  const granted = new Set(roles)
  return allowedRoles.some((role) => granted.has(role))
}

type MobileMenuLinkProps = {
  href: string
  children: string
  testId: string
  onNavigate: () => void
}

function MobileMenuLink({ href, children, testId, onNavigate }: MobileMenuLinkProps) {
  return (
    <Link
      href={href}
      className="block rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
      data-testid={testId}
      onClick={onNavigate}
    >
      {children}
    </Link>
  )
}

export function HeaderMobileMenu() {
  const router = useRouter()
  const { me, isLoading, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const isAuthenticated = me.isAuthenticated
  const canSeeDashboard = isAuthenticated
  const canSeeAdmin = hasAnyRole(me.roles, ["STAFF", "OWNER"])

  const closeMenu = () => setOpen(false)

  async function handleLogout() {
    if (isLoggingOut) return

    setIsLoggingOut(true)

    try {
      await logout()
      closeMenu()
      router.replace("/")
      router.refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

  useEffect(() => {
    function handleThemeMenuOpen() {
      setOpen(false)
    }

    window.addEventListener(THEME_MENU_OPEN_EVENT, handleThemeMenuOpen)

    return () => {
      window.removeEventListener(THEME_MENU_OPEN_EVENT, handleThemeMenuOpen)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current) return
      if (menuRef.current.contains(event.target as Node)) return
      closeMenu()
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu()
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  return (
    <div className="relative md:hidden" ref={menuRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-controls="mobile-site-menu"
        onClick={() => setOpen((value) => !value)}
        data-testid="nav-menu-button"
        className="h-10 rounded-2xl border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] text-[color:var(--mk-ink)] shadow-sm transition hover:scale-[1.02] hover:bg-[color:var(--mk-panel-muted)]"
      >
        <Menu className="mr-2 h-4 w-4" />
        Menu
      </Button>

      {open ? (
        <div
          id="mobile-site-menu"
          className="absolute right-0 top-12 z-[100] w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-[color:var(--mk-border)] bg-[#fffaf2] p-3 text-[color:var(--mk-ink)] shadow-[var(--mk-shadow)] dark:bg-[#050712]"
          style={{ right: "0", left: "auto" }}
          data-testid="nav-mobile-menu"
        >
          <div className="max-h-[70vh] space-y-1 overflow-y-auto">
            <MobileMenuLink href="/" testId="nav-home-mobile" onNavigate={closeMenu}>
              Home
            </MobileMenuLink>

            <MobileMenuLink href="/shop" testId="nav-shop-mobile" onNavigate={closeMenu}>
              Shop
            </MobileMenuLink>

            <MobileMenuLink href="/auctions" testId="nav-auctions-mobile" onNavigate={closeMenu}>
              Auctions
            </MobileMenuLink>

            <MobileMenuLink href="/cart" testId="nav-cart-mobile-menu" onNavigate={closeMenu}>
              Cart
            </MobileMenuLink>

            {!isLoading && !isAuthenticated ? (
              <>
                <MobileMenuLink href="/login" testId="nav-login-mobile" onNavigate={closeMenu}>
                  Login
                </MobileMenuLink>

                <MobileMenuLink
                  href="/register"
                  testId="nav-register-mobile"
                  onNavigate={closeMenu}
                >
                  Register
                </MobileMenuLink>
              </>
            ) : null}

            {!isLoading && canSeeDashboard ? (
              <MobileMenuLink
                href="/dashboard"
                testId="nav-dashboard-mobile"
                onNavigate={closeMenu}
              >
                Dashboard
              </MobileMenuLink>
            ) : null}

            {!isLoading && isAuthenticated ? (
              <MobileMenuLink href="/support" testId="nav-support-mobile" onNavigate={closeMenu}>
                Support
              </MobileMenuLink>
            ) : null}

            {!isLoading && isAuthenticated ? (
              <MobileMenuLink href="/account" testId="nav-account-mobile" onNavigate={closeMenu}>
                Account
              </MobileMenuLink>
            ) : null}

            {!isLoading && canSeeAdmin ? (
              <MobileMenuLink href="/admin" testId="nav-admin-mobile" onNavigate={closeMenu}>
                Admin
              </MobileMenuLink>
            ) : null}

            {!isLoading && isAuthenticated ? (
              <div className="border-t border-[color:var(--mk-border)] pt-2">
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="nav-logout-mobile"
                >
                  <LogOut className="h-4 w-4 text-[color:var(--mk-gold)]" />
                  {isLoggingOut ? "Logging out…" : "Logout"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}