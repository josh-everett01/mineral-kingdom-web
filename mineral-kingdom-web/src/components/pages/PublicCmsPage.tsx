import { Container } from "@/components/site/Container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type PublicCmsPageProps = {
  title: string
  contentHtml: string
}

export function PublicCmsPage({ title, contentHtml }: PublicCmsPageProps) {
  return (
    <Container className="py-10 md:py-14">
      <Card className="mx-auto max-w-4xl rounded-2xl shadow-sm">
        <CardHeader className="border-b pb-5">
          <CardTitle
            data-testid="public-page-title"
            className="text-2xl font-semibold tracking-tight md:text-3xl"
          >
            {title}
          </CardTitle>
        </CardHeader>

        <CardContent className="px-6 py-6 md:px-10 md:py-8">
          <article
            data-testid="public-page-content"
            className="cms-content max-w-none"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </CardContent>
      </Card>
    </Container>
  )
}