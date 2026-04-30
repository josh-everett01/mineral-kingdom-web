import Link from "next/link"
import { Gem, ShoppingCart } from "lucide-react"

import { Container } from "@/components/site/Container"
import { ThemeToggle } from "@/components/site/ThemeToggle"
import { HeaderAuthButton } from "@/components/site/HeaderAuthButton"
import { HeaderAuthLinks } from "@/components/site/HeaderAuthLinks"
import { HeaderMobileMenu } from "@/components/site/HeaderMobileMenu"
import { fetchCart } from "@/lib/cart/getCart"

export async function Header() {
  const cart = await fetchCart()
  const cartQuantity = cart?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--mk-border)] bg-[rgb(var(--mk-page-rgb)/0.82)] shadow-sm backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-8">
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-3"
            data-testid="nav-brand"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel)] text-[color:var(--mk-gold)] shadow-[var(--mk-glow)] transition group-hover:scale-[1.02]">
              <Gem className="h-5 w-5" />
            </span>

            <span className="min-w-0">
              <span className="block truncate text-base font-semibold tracking-tight text-[color:var(--mk-ink)]">
                Mineral Kingdom
              </span>
              <span className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] mk-muted-text sm:block">
                Minerals & Auctions
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-medium mk-muted-text md:flex">
            <Link href="/" className="transition hover:text-[color:var(--mk-ink)]" data-testid="nav-home">
              Home
            </Link>

            <Link href="/shop" className="transition hover:text-[color:var(--mk-ink)]" data-testid="nav-shop">
              Shop
            </Link>

            <Link href="/auctions" className="transition hover:text-[color:var(--mk-ink)]" data-testid="nav-auctions">
              Auctions
            </Link>

            <Link href="/cart" className="transition hover:text-[color:var(--mk-ink)]" data-testid="nav-cart">
              Cart
              {cartQuantity > 0 ? (
                <span
                  className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[color:var(--mk-ink)] px-1.5 py-0.5 text-xs font-semibold text-[color:var(--mk-page)]"
                  data-testid="nav-cart-count"
                >
                  {cartQuantity}
                </span>
              ) : null}
            </Link>

            <HeaderAuthLinks />
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/cart"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 text-sm font-semibold text-[color:var(--mk-ink)] shadow-sm transition hover:scale-[1.02] md:hidden"
            data-testid="nav-cart-mobile"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Cart</span>
            {cartQuantity > 0 ? (
              <span
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-[color:var(--mk-ink)] px-1.5 py-0.5 text-xs font-semibold text-[color:var(--mk-page)]"
                data-testid="nav-cart-count-mobile"
              >
                {cartQuantity}
              </span>
            ) : null}
          </Link>

          <HeaderAuthButton />
          <ThemeToggle />
          <HeaderMobileMenu />
        </div>
      </Container>
    </header>
  )
}