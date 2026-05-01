import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRight, Gavel, Gem, ShieldCheck, Sparkles, Truck } from "lucide-react"

import { HomeSection } from "@/components/home/HomeSection"
import { Container } from "@/components/site/Container"
import { fetchHomeSections } from "@/lib/home/getHomeSections"

const HERO_LIGHT_DESKTOP = "/art/hero/home-hero-light-alt.webp"
const HERO_DARK_DESKTOP = "/art/hero/home-hero-dark.webp"
const HERO_LIGHT_MOBILE = "/art/hero/home-hero-light-alt.webp"
const HERO_DARK_MOBILE = "/art/hero/home-hero-dark-alt.webp"

export default async function HomePage() {
  const sections = await fetchHomeSections()

  return (
    <div className="mk-preview-page overflow-x-hidden">
      <Container className="max-w-[1760px] min-w-0 space-y-8 py-6 sm:py-10">
        <section className="mk-aurora-card relative min-h-[560px] overflow-hidden rounded-[2rem] border border-[color:var(--mk-border)] px-5 py-8 sm:min-h-[520px] sm:px-8 sm:py-12 lg:min-h-[500px] lg:px-10 xl:px-12">
          <Image
            src={HERO_LIGHT_DESKTOP}
            alt=""
            fill
            priority
            sizes="(min-width: 1760px) 1760px, (min-width: 1024px) calc(100vw - 4rem), 100vw"
            className="hidden object-cover object-[70%_center] dark:hidden lg:block"
          />

          <Image
            src={HERO_DARK_DESKTOP}
            alt=""
            fill
            priority
            sizes="(min-width: 1760px) 1760px, (min-width: 1024px) calc(100vw - 4rem), 100vw"
            className="hidden object-cover object-[96%_center] brightness-[1.85] contrast-[1.12] saturate-[1.8] lg:dark:block"
          />

          <Image
            src={HERO_LIGHT_MOBILE}
            alt=""
            fill
            priority
            sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) calc(100vw - 3rem), 100vw"
            className="object-cover object-[62%_center] dark:hidden lg:hidden"
          />

          <Image
            src={HERO_DARK_MOBILE}
            alt=""
            fill
            priority
            sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) calc(100vw - 3rem), 100vw"
            className="hidden object-cover object-[62%_center] dark:block lg:hidden"
          />

          {/* Mobile readability only */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,251,245,0.88)_0%,rgba(255,251,245,0.82)_46%,rgba(255,251,245,0.62)_100%)] dark:hidden lg:hidden" />
          <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(180deg,rgba(4,6,18,0.72)_0%,rgba(4,6,18,0.62)_50%,rgba(4,6,18,0.48)_100%)] dark:block lg:hidden" />

          {/* Global accent glows */}
          <div className="pointer-events-none absolute inset-0 opacity-100">
            <div className="absolute -right-16 top-8 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(217,119,255,0.26),transparent_68%)] blur-2xl" />
            <div className="absolute right-10 bottom-4 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.22),transparent_70%)] blur-2xl" />
            <div className="absolute left-1/2 top-0 h-px w-1/2 bg-gradient-to-r from-transparent via-[color:var(--mk-gold)] to-transparent opacity-50" />
          </div>

          {/* Desktop dark-mode brightening layers — intentionally LIGHTENING, not darkening */}
          <div className="pointer-events-none absolute inset-0 hidden lg:dark:block">
            <div className="absolute inset-0 bg-white/[0.04] mix-blend-screen" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_45%,rgba(255,255,255,0.10),transparent_22%),radial-gradient(circle_at_80%_56%,rgba(236,72,153,0.16),transparent_22%),radial-gradient(circle_at_66%_70%,rgba(59,130,246,0.18),transparent_24%),radial-gradient(circle_at_84%_28%,rgba(192,132,252,0.18),transparent_28%)] mix-blend-screen" />
            <div className="absolute right-[10%] top-[8%] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(192,132,252,0.14),transparent_68%)] blur-3xl mix-blend-screen" />
            <div className="absolute right-[20%] bottom-[4%] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.14),transparent_68%)] blur-3xl mix-blend-screen" />
          </div>

          <div className="relative z-10 flex min-h-[500px] items-center sm:min-h-[460px] lg:min-h-[430px]">
            <div className="w-full min-w-0 max-w-2xl space-y-6">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)]/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] mk-muted-text shadow-sm backdrop-blur sm:text-xs sm:tracking-[0.22em]">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-[color:var(--mk-gold)]" />
                <span className="min-w-0 whitespace-normal leading-tight sm:whitespace-nowrap">
                  Rare minerals. Extraordinary discoveries.
                </span>
              </div>

              <div className="space-y-4 min-w-0">
                <h1 className="max-w-[10ch] text-4xl font-semibold leading-[0.98] tracking-tight text-[color:var(--mk-ink)] sm:max-w-[13ch] sm:text-6xl lg:text-7xl">
                  Rare Minerals.
                  <br />
                  <span className="mk-gradient-text">Auctions & Direct Buy.</span>
                </h1>

                <p className="max-w-xl text-base leading-7 mk-muted-text sm:text-lg">
                  Discover one-of-a-kind specimens through collector auctions and fixed-price
                  listings from around the globe.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/shop"
                  className="mk-cta inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition hover:scale-[1.01] active:scale-[0.99] sm:w-auto"
                >
                  Explore the Collection
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/auctions"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel)]/90 px-5 py-3 text-sm font-semibold text-[color:var(--mk-gold)] shadow-sm backdrop-blur transition hover:scale-[1.01] active:scale-[0.99] sm:w-auto"
                >
                  View Auctions
                  <Gavel className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-3 pt-2 sm:grid-cols-3">
                <HeroPill icon={<Gem className="h-4 w-4" />} label="Curated specimens" />
                <HeroPill icon={<ShieldCheck className="h-4 w-4" />} label="Secure checkout" />
                <HeroPill icon={<Truck className="h-4 w-4" />} label="Collector shipping" />
              </div>
            </div>
          </div>
        </section>

        {sections ? (
          <div className="grid min-w-0 gap-6 xl:grid-cols-2 2xl:grid-cols-4">
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
  icon: ReactNode
  label: string
}) {
  return (
    <div className="mk-glass min-w-0 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium">
      <span className="shrink-0 text-[color:var(--mk-gold)]">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  )
}