import Link from "next/link";
import { Container } from "@/components/site/Container";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { Separator } from "@/components/ui/separator";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <Container className="flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">
            Mineral Kingdom
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <Link href="/shop" className="hover:text-foreground">Shop</Link>
            <Link href="/auctions" className="hover:text-foreground">Auctions</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </Container>
      <Separator />
    </header>
  );
}