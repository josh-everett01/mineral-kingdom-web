import Link from "next/link"
import { ArrowRight, Gavel, Gem, ShieldCheck, Sparkles, Truck } from "lucide-react"

import { HomeSection } from "@/components/home/HomeSection"
import { Container } from "@/components/site/Container"
import { fetchHomeSections } from "@/lib/home/getHomeSections"

export default async function HomePage() {
  const sections = await fetchHomeSections()

  return (
    <div className="mk-preview-page overflow-x-hidden">
      <Container className="max-w-[1760px] space-y-8 py-6 sm:py-10">
        <section className="mk-aurora-card relative overflow-hidden rounded-[2rem] border border-[color:var(--mk-border)] px-5 py-8 sm:px-8 sm:py-12 lg:min-h-[500px] lg:px-10 xl:px-12">
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div className="absolute -right-16 top-8 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(217,119,255,0.28),transparent_68%)] blur-2xl" />
            <div className="absolute right-10 bottom-4 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.20),transparent_70%)] blur-2xl" />
            <div className="absolute left-1/2 top-0 h-px w-1/2 bg-gradient-to-r from-transparent via-[color:var(--mk-gold)] to-transparent opacity-50" />
          </div>

          <div className="relative z-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center xl:gap-12">
            <div className="max-w-2xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] mk-muted-text">
                <Sparkles className="h-3.5 w-3.5 text-[color:var(--mk-gold)]" />
                Rare minerals. Extraordinary discoveries.
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                  Rare Minerals.
                  <br />
                  <span className="mk-gradient-text">Weekly Auctions.</span>
                </h1>

                <p className="max-w-xl text-base leading-7 mk-muted-text sm:text-lg">
                  Discover featured minerals, browse newly added pieces, watch auctions ending soon,
                  and preview upcoming auctions from trusted collectors.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/shop"
                  className="mk-cta inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  Explore the Collection
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/auctions"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel)] px-5 py-3 text-sm font-semibold text-[color:var(--mk-gold)] shadow-sm transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  View Auctions
                  <Gavel className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div
              className="mk-hero-art relative mx-auto my-2 min-h-[280px] w-full max-w-sm sm:min-h-[340px] sm:max-w-md lg:my-0 lg:min-h-[430px] lg:max-w-2xl xl:max-w-3xl"
              aria-hidden="true"
            >
              <div className="mk-hero-aurora" />
              <div className="mk-hero-glow-floor" />
              <div className="mk-hero-base" />

              <div className="mk-hero-crystal mk-hero-crystal-left" />
              <div className="mk-hero-crystal mk-hero-crystal-main" />
              <div className="mk-hero-crystal mk-hero-crystal-front" />
              <div className="mk-hero-crystal mk-hero-crystal-small" />

              <div className="mk-hero-sparkle mk-hero-sparkle-a" />
              <div className="mk-hero-sparkle mk-hero-sparkle-b" />
              <div className="mk-hero-sparkle mk-hero-sparkle-c" />
            </div>
            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              <HeroPill icon={<Gem className="h-4 w-4" />} label="Curated specimens" />
              <HeroPill icon={<ShieldCheck className="h-4 w-4" />} label="Secure checkout" />
              <HeroPill icon={<Truck className="h-4 w-4" />} label="Collector shipping" />
            </div>
          </div>
        </section>

        {sections ? (
          <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-4">
            <HomeSection section={sections.featuredListings} kind="listing" />
            <HomeSection section={sections.endingSoonAuctions} kind="auction" />
            <HomeSection section={sections.upcomingAuctions} kind="auction" />
            <HomeSection section={sections.newArrivals} kind="listing" />
          </div>
        ) : (
          <section
            data-testid="home-sections-fallback"
            className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
          >
            Homepage sections are temporarily unavailable.
          </section>
        )}
      </Container>
    </div>
  )
}

function HeroPill({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="mk-glass flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium">
      <span className="text-[color:var(--mk-gold)]">{icon}</span>
      <span>{label}</span>
    </div>
  )
}