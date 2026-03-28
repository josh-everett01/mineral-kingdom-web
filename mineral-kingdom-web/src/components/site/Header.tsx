import Link from "next/link"
import { Container } from "@/components/site/Container"
import { ThemeToggle } from "@/components/site/ThemeToggle"
import { HeaderAuthButton } from "@/components/site/HeaderAuthButton"
import { HeaderAuthLinks } from "@/components/site/HeaderAuthLinks"
import { HeaderMobileMenu } from "@/components/site/HeaderMobileMenu"
import { Separator } from "@/components/ui/separator"
import { fetchCart } from "@/lib/cart/getCart"

export async function Header() {
  const cart = await fetchCart()
  const cartQuantity = cart?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <Container className="flex h-14 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="truncate font-semibold tracking-tight" data-testid="nav-brand">
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

            <Link href="/cart" className="hover:text-foreground" data-testid="nav-cart">
              Cart
              {cartQuantity > 0 ? (
                <span
                  className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-stone-900 px-1.5 py-0.5 text-xs font-semibold text-white"
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
            className="text-sm hover:text-foreground md:hidden"
            data-testid="nav-cart-mobile"
          >
            Cart
            {cartQuantity > 0 ? (
              <span
                className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-stone-900 px-1.5 py-0.5 text-xs font-semibold text-white"
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
      <Separator />
    </header>
  )
}