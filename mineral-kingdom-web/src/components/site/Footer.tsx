import Link from "next/link"
import { Container } from "@/components/site/Container"

export function Footer() {
  return (
    <footer className="border-t">
      <Container className="flex flex-col gap-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <span>© {new Date().getFullYear()} Mineral Kingdom</span>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <Link href="/about" className="hover:text-foreground">About</Link>
          <Link href="/faq" className="hover:text-foreground">FAQ</Link>
          <Link href="/terms" className="hover:text-foreground">Terms &amp; Conditions</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/auction-rules" className="hover:text-foreground">Auction Rules</Link>
          <Link href="/buying-rules" className="hover:text-foreground">Buying Rules</Link>
        </nav>
      </Container>
    </footer>
  )
}