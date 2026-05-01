import Link from "next/link"
import Image from "next/image"
import { ShoppingCart } from "lucide-react"

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
      <Container className="flex h-16 items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div
              className="
  flex h-12 w-12 shrink-0 items-center justify-center rounded-full border
  border-amber-300/90 bg-[linear-gradient(180deg,#fff7df_0%,#ffe9b8_100%)]
  shadow-sm dark:border-[color:var(--mk-border)] dark:bg-[color:var(--mk-panel)]
"
            >
              <Image
                src="/brand/mineral-kingdom-icon-transparent.png"
                alt="Mineral Kingdom"
                width={38}
                height={38}
                className="h-9 w-9 shrink-0 object-contain"
                priority
              />
            </div>

            <span className="truncate text-xl font-semibold text-[color:var(--mk-ink)]">
              Mineral Kingdom
            </span>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-medium mk-muted-text md:flex">
            <Link
              href="/"
              className="transition hover:text-[color:var(--mk-ink)]"
              data-testid="nav-home"
            >
              Home
            </Link>

            <Link
              href="/shop"
              className="transition hover:text-[color:var(--mk-ink)]"
              data-testid="nav-shop"
            >
              Shop
            </Link>

            <Link
              href="/auctions"
              className="transition hover:text-[color:var(--mk-ink)]"
              data-testid="nav-auctions"
            >
              Auctions
            </Link>

            <Link
              href="/cart"
              className="transition hover:text-[color:var(--mk-ink)]"
              data-testid="nav-cart"
            >
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] text-sm font-semibold text-[color:var(--mk-ink)] shadow-sm transition hover:scale-[1.02] md:hidden"
            data-testid="nav-cart-mobile"
            aria-label="Cart"
          >
            <ShoppingCart className="h-4 w-4" />
            {cartQuantity > 0 ? (
              <span
                className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[color:var(--mk-ink)] px-1.5 py-0.5 text-xs font-semibold text-[color:var(--mk-page)]"
                data-testid="nav-cart-count-mobile"
              >
                {cartQuantity}
              </span>
            ) : null}
          </Link>

          <div className="hidden md:block">
            <HeaderAuthButton />
          </div>

          <ThemeToggle />
          <HeaderMobileMenu />
        </div>
      </Container>
    </header>
  )
}