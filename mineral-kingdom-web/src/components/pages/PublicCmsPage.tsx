import { Container } from "@/components/site/Container"

type PublicCmsPageProps = {
  title: string
  contentHtml: string
}

export function PublicCmsPage({ title, contentHtml }: PublicCmsPageProps) {
  return (
    <main className="mk-preview-page min-h-screen overflow-x-hidden">
      <Container className="py-8 sm:py-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              Mineral Kingdom
            </p>

            <h1
              data-testid="public-page-title"
              className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] sm:text-5xl"
            >
              {title}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 mk-muted-text sm:text-base">
              Helpful information, policies, and guidance for shopping, auctions, and using Mineral
              Kingdom.
            </p>
          </section>

          <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
            <article
              data-testid="public-page-content"
              className="cms-content max-w-none"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          </section>
        </div>
      </Container>
    </main>
  )
}