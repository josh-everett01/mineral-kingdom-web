import type * as React from "react"
import Link from "next/link"
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Gem,
  Heart,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  WalletCards,
} from "lucide-react"

type Specimen = {
  title: string
  locality: string
  price: string
  badge?: string
  colors: [string, string]
}

type Auction = {
  title: string
  locality: string
  price: string
  meta: string
  timer: string
  action: string
  colors: [string, string]
}

const featured: Specimen[] = [
  {
    title: "Amethyst Geode",
    locality: "Artigas, Uruguay",
    price: "$680.00",
    badge: "Premium",
    colors: ["#7c3aed", "#f0abfc"],
  },
  {
    title: "Malachite",
    locality: "Kolwezi, DR Congo",
    price: "$540.00",
    badge: "Premium",
    colors: ["#047857", "#86efac"],
  },
]

const newArrivals: Specimen[] = [
  {
    title: "Smoky Quartz",
    locality: "Erongo, Namibia",
    price: "$260.00",
    badge: "New",
    colors: ["#57534e", "#fde68a"],
  },
  {
    title: "Rhodonite",
    locality: "Sweet Home Mine, USA",
    price: "$195.00",
    badge: "New",
    colors: ["#be185d", "#f9a8d4"],
  },
]

const endingSoon: Auction[] = [
  {
    title: "Fluorite",
    locality: "Yaogangxian, China",
    price: "$420.00",
    meta: "7 bids",
    timer: "1h 24m",
    action: "Place Bid",
    colors: ["#4f46e5", "#22d3ee"],
  },
  {
    title: "Vanadinite",
    locality: "Mibladen, Morocco",
    price: "$310.00",
    meta: "5 bids",
    timer: "2h 11m",
    action: "Place Bid",
    colors: ["#b91c1c", "#fb923c"],
  },
]

const upcoming: Auction[] = [
  {
    title: "Tourmaline",
    locality: "Pederneira, Brazil",
    price: "$250.00",
    meta: "Opening bid",
    timer: "2d 14h",
    action: "Remind Me",
    colors: ["#be185d", "#34d399"],
  },
  {
    title: "Azurite",
    locality: "Chessy, France",
    price: "$180.00",
    meta: "Opening bid",
    timer: "3d 18h",
    action: "Remind Me",
    colors: ["#1d4ed8", "#22c55e"],
  },
]

function SpecimenArt({ colors, label }: { colors: [string, string]; label: string }) {
  return (
    <div
      className="mk-specimen-bg relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl"
      style={{
        "--specimen-a": colors[0],
        "--specimen-b": colors[1],
      } as React.CSSProperties}
      aria-label={label}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.24),transparent_44%)]" />
      <div className="mk-crystal-blob h-20 w-20 rotate-12 opacity-95 sm:h-24 sm:w-24" />
      <div className="mk-crystal-blob absolute bottom-5 right-6 h-10 w-10 -rotate-12 opacity-75" />
    </div>
  )
}

function Hero() {
  return (
    <section className="mk-aurora-card relative isolate overflow-hidden rounded-[2rem] border border-[color:var(--mk-border)] px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[color:var(--mk-amethyst)] opacity-20 blur-3xl" />
      <div className="absolute bottom-0 right-0 hidden h-full w-1/2 bg-[radial-gradient(circle_at_60%_48%,rgb(255_255_255/0.16),transparent_36%)] lg:block" />
      <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--mk-gold)]">
            <Sparkles className="h-3.5 w-3.5" />
            Rare minerals. Extraordinary discoveries.
          </div>
          <h1 className="text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            Rare Minerals.
            <span className="mk-gradient-text block">Weekly Auctions.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 mk-muted-text sm:text-lg">
            A polished design-system preview for browsing curated specimens, joining live auctions, and checking out confidently on every device.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/shop" className="mk-cta inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition hover:scale-[1.01]">
              Explore the Collection <ChevronRight className="h-4 w-4" />
            </Link>
            <Link href="/auctions" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-5 py-3 text-sm font-semibold">
              View Auctions
            </Link>
          </div>
        </div>

        <div className="relative min-h-[280px] lg:min-h-[360px]" aria-hidden="true">
          <div className="absolute bottom-2 right-4 h-56 w-48 rotate-6 rounded-[2rem] bg-[linear-gradient(135deg,var(--mk-amethyst),var(--mk-cyan),var(--mk-gold))] opacity-20 blur-2xl" />
          <div className="mk-crystal-blob absolute bottom-4 right-16 h-64 w-40 rotate-6" />
          <div className="mk-crystal-blob absolute bottom-12 right-44 h-44 w-28 -rotate-12 opacity-90" />
          <div className="mk-crystal-blob absolute bottom-2 right-0 h-36 w-24 rotate-[22deg] opacity-80" />
          <div className="absolute bottom-0 right-5 h-16 w-72 rounded-[50%] bg-black/20 blur-xl dark:bg-black/40" />
        </div>
      </div>
    </section>
  )
}

function ListingCard({ item }: { item: Specimen }) {
  return (
    <article className="mk-glass mk-scroll-card flex flex-col overflow-hidden rounded-3xl p-3">
      <div className="relative">
        <SpecimenArt colors={item.colors} label={item.title} />
        <button className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-[rgb(var(--mk-page-rgb)/0.72)] backdrop-blur">
          <Heart className="h-4 w-4" />
        </button>
        {item.badge ? (
          <span className="absolute left-2 top-2 rounded-full bg-[color:var(--mk-amethyst)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {item.badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-2 pt-4">
        <h3 className="line-clamp-1 font-semibold">{item.title}</h3>
        <p className="mt-1 line-clamp-1 text-sm mk-muted-text">{item.locality}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="font-semibold text-[color:var(--mk-gold)]">{item.price}</span>
          <button className="grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--mk-ink)] text-[color:var(--mk-page)]">
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  )
}

function AuctionMiniCard({ item, tone }: { item: Auction; tone: "hot" | "cool" }) {
  return (
    <article className="mk-glass mk-scroll-card overflow-hidden rounded-3xl p-3">
      <div className="relative">
        <SpecimenArt colors={item.colors} label={item.title} />
        <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white ${tone === "hot" ? "bg-[color:var(--mk-danger)]" : "bg-[color:var(--mk-cyan)]"}`}>
          {item.timer}
        </span>
      </div>
      <div className="space-y-3 p-2 pt-4">
        <div>
          <h3 className="line-clamp-1 font-semibold">{item.title}</h3>
          <p className="mt-1 line-clamp-1 text-sm mk-muted-text">{item.locality}</p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide mk-muted-text">{tone === "hot" ? "Current bid" : item.meta}</p>
            <p className="font-semibold text-[color:var(--mk-gold)]">{item.price}</p>
            <p className="text-xs mk-muted-text">{item.meta}</p>
          </div>
          <button className="rounded-2xl bg-[color:var(--mk-amethyst)] px-3 py-2 text-xs font-semibold text-white">
            {item.action}
          </button>
        </div>
      </div>
    </article>
  )
}

function PreviewSection({
  title,
  count,
  icon,
  children,
}: {
  title: string
  count: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mk-glass-strong w-full max-w-full overflow-hidden rounded-[2rem] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--mk-amethyst),var(--mk-cyan))] text-white shadow-[var(--mk-glow)]">
            {icon}
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <p className="text-sm mk-muted-text">{count}</p>
          </div>
        </div>
        <Link href="#" className="inline-flex items-center gap-1 rounded-full border border-[color:var(--mk-border)] px-3 py-2 text-sm font-medium mk-muted-text">
          Browse all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      {children}
    </section>
  )
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-gold)]">
        {icon}
      </span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm mk-muted-text">{text}</p>
      </div>
    </div>
  )
}

export function MineralKingdomPreview() {
  return (
    <div className="mk-preview-page min-h-screen overflow-x-hidden">
      <main className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-3 text-sm mk-muted-text backdrop-blur">
          Design preview only. This route lets us approve the new responsive look before applying it to the live homepage, shop, auctions, cart, and checkout.
        </div>

        <Hero />

        <div className="grid gap-6 xl:grid-cols-2">
          <PreviewSection title="Featured Listings" count="6 items" icon={<Star className="h-5 w-5" />}>
            <div className="mk-scroll-rail pb-2">
              {featured.map((item) => <ListingCard key={item.title} item={item} />)}
            </div>
          </PreviewSection>

          <PreviewSection title="Auctions Ending Soon" count="4 items" icon={<Clock3 className="h-5 w-5" />}>
            <div className="mk-scroll-rail pb-2">
              {endingSoon.map((item) => <AuctionMiniCard key={item.title} item={item} tone="hot" />)}
            </div>
          </PreviewSection>

          <PreviewSection title="Upcoming Auctions" count="3 items" icon={<CalendarDays className="h-5 w-5" />}>
            <div className="mk-scroll-rail pb-2">
              {upcoming.map((item) => <AuctionMiniCard key={item.title} item={item} tone="cool" />)}
            </div>
          </PreviewSection>

          <PreviewSection title="New Arrivals" count="8 items" icon={<Sparkles className="h-5 w-5" />}>
            <div className="mk-scroll-rail pb-2">
              {newArrivals.map((item) => <ListingCard key={item.title} item={item} />)}
            </div>
          </PreviewSection>
        </div>

        <section className="mk-glass-strong grid gap-5 rounded-[2rem] p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Benefit icon={<Gem className="h-5 w-5" />} title="Authentic & Curated" text="Every piece hand-selected for quality and rarity." />
          <Benefit icon={<Truck className="h-5 w-5" />} title="Global Shipping" text="Secure, insured delivery with buyer confidence." />
          <Benefit icon={<ShieldCheck className="h-5 w-5" />} title="Trusted by Collectors" text="Premium browsing without sacrificing clarity." />
          <Benefit icon={<WalletCards className="h-5 w-5" />} title="Secure Checkout" text="Checkout pages should stay calm, focused, and trustworthy." />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="mk-glass rounded-[2rem] p-5">
            <h2 className="font-semibold">Mobile behavior</h2>
            <p className="mt-2 text-sm leading-6 mk-muted-text">Sections become stacked cards with horizontal item rails, larger tap targets, and compact header actions.</p>
          </div>
          <div className="mk-glass rounded-[2rem] p-5">
            <h2 className="font-semibold">Light / dark mode</h2>
            <p className="mt-2 text-sm leading-6 mk-muted-text">The same components use semantic Mineral Kingdom tokens so each mode has its own intentional mood.</p>
          </div>
          <div className="mk-glass rounded-[2rem] p-5">
            <h2 className="font-semibold">No sigil treatment</h2>
            <p className="mt-2 text-sm leading-6 mk-muted-text">The hero uses crystal artwork, aurora glow, and open space instead of the geometric emblem.</p>
          </div>
        </section>
      </main>
    </div>
  )
}
