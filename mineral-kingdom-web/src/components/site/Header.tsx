import Link from "next/link"
import { Container } from "@/components/site/Container"
import { ThemeToggle } from "@/components/site/ThemeToggle"
import { Separator } from "@/components/ui/separator"
import { getCurrentSession, hasAnyRole } from "@/lib/auth/session"

export async function Header() {
  const session = await getCurrentSession()

  const canSeeDashboard = session.isAuthenticated
  const canSeeAdmin = hasAnyRole(session, ["STAFF", "OWNER"])

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <Container className="flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight" data-testid="nav-brand">
            Mineral Kingdom
          </Link>

          <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
            <Link href="/" className="hover:text-foreground" data-testid="nav-home">
              Home
            </Link>
            <Link href="/shop" className="hover:text-foreground" data-testid="nav-shop">
              Shop
            </Link>
            <Link href="/auctions" className="hover:text-foreground" data-testid="nav-auctions">
              Auctions
            </Link>

            {canSeeDashboard ? (
              <Link
                href="/dashboard"
                className="hover:text-foreground"
                data-testid="nav-dashboard"
              >
                Dashboard
              </Link>
            ) : null}

            {canSeeAdmin ? (
              <Link href="/admin" className="hover:text-foreground" data-testid="nav-admin">
                Admin
              </Link>
            ) : null}

            {session.isAuthenticated ? (
              <Link href="/account" className="hover:text-foreground" data-testid="nav-account">
                Account
              </Link>
            ) : (
              <>
                <Link href="/login" className="hover:text-foreground" data-testid="nav-login">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="hover:text-foreground"
                  data-testid="nav-register"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </Container>
      <Separator />
    </header>
  )
}