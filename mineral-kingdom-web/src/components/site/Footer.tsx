import Link from "next/link"
import { Gem, ShieldCheck, Truck, Gavel } from "lucide-react"

import { Container } from "@/components/site/Container"

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--mk-border)] bg-[rgb(var(--mk-page-rgb)/0.92)]">
      <Container className="py-8">
        <div className="mk-glass-strong overflow-hidden rounded-[2rem] p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
            <div className="space-y-4">
              <Link href="/" className="inline-flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel)] text-[color:var(--mk-gold)]">
                  <Gem className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold tracking-tight text-[color:var(--mk-ink)]">
                    Mineral Kingdom
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] mk-muted-text">
                    Curated minerals & auctions
                  </span>
                </span>
              </Link>

              <p className="max-w-xl text-sm leading-6 mk-muted-text">
                Discover featured minerals, fixed-price listings, and collector-focused auctions
                with a polished, secure buying experience.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <FooterTrustPill icon={<Gem className="h-4 w-4" />} label="Curated pieces" />
                <FooterTrustPill icon={<Truck className="h-4 w-4" />} label="Secure shipping" />
                <FooterTrustPill icon={<ShieldCheck className="h-4 w-4" />} label="Buyer confidence" />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <FooterLinkGroup
                title="Shop"
                links={[
                  { href: "/shop", label: "Shop all" },
                  { href: "/auctions", label: "Auctions" },
                  { href: "/cart", label: "Cart" },
                  { href: "/faq", label: "FAQ" },
                ]}
              />

              <FooterLinkGroup
                title="Policies"
                links={[
                  { href: "/about", label: "About" },
                  { href: "/terms", label: "Terms" },
                  { href: "/privacy", label: "Privacy" },
                  { href: "/auction-rules", label: "Auction Rules" },
                  { href: "/buying-rules", label: "Buying Rules" },
                ]}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-[color:var(--mk-border)] pt-5 text-xs mk-muted-text sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Mineral Kingdom. All rights reserved.</span>
            <span className="inline-flex items-center gap-2">
              <Gavel className="h-3.5 w-3.5 text-[color:var(--mk-gold)]" />
              Fair bidding. Secure checkout. Collector-focused service.
            </span>
          </div>
        </div>
      </Container>
    </footer>
  )
}

function FooterTrustPill({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="mk-glass flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold">
      <span className="text-[color:var(--mk-gold)]">{icon}</span>
      <span>{label}</span>
    </div>
  )
}

function FooterLinkGroup({
  title,
  links,
}: {
  title: string
  links: Array<{ href: string; label: string }>
}) {
  return (
    <nav className="space-y-3">
      <h2 className="text-sm font-semibold text-[color:var(--mk-ink)]">{title}</h2>

      <div className="grid gap-2 text-sm mk-muted-text">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="transition hover:text-[color:var(--mk-ink)]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}