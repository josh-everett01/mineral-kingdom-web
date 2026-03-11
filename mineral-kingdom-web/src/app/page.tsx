import { Container } from "@/components/site/Container"
import { HomeSection } from "@/components/home/HomeSection"
import { fetchHomeSections } from "@/lib/home/getHomeSections"

export default async function HomePage() {
  const sections = await fetchHomeSections()

  return (
    <Container className="space-y-10 py-10">
      <section className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Mineral Kingdom</h1>
        <p className="max-w-2xl text-muted-foreground">
          Discover featured minerals, browse newly added pieces, and watch auctions that are ending soon.
        </p>
      </section>

      {sections ? (
        <>
          <HomeSection section={sections.featuredListings} kind="listing" />
          <HomeSection section={sections.endingSoonAuctions} kind="auction" />
          <HomeSection section={sections.newArrivals} kind="listing" />
        </>
      ) : (
        <section
          data-testid="home-sections-fallback"
          className="rounded-lg border p-6 text-sm text-muted-foreground"
        >
          Homepage sections are temporarily unavailable.
        </section>
      )}
    </Container>
  )
}