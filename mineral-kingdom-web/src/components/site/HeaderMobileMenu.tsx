"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/useAuth"

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
      className="block rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 hover:text-stone-900"
      data-testid={testId}
      onClick={onNavigate}
    >
      {children}
    </Link>
  )
}

export function HeaderMobileMenu() {
  const { me, isLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const isAuthenticated = me.isAuthenticated
  const canSeeDashboard = isAuthenticated
  const canSeeAdmin = hasAnyRole(me.roles, ["STAFF", "OWNER"])

  const closeMenu = () => setOpen(false)

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
      >
        Menu
      </Button>

      {open ? (
        <div
          id="mobile-site-menu"
          className="absolute right-0 top-12 z-50 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 shadow-lg"
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
          </div>
        </div>
      ) : null}
    </div>
  )
}