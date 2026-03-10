import { Container } from "@/components/site/Container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type PublicCmsPageProps = {
  title: string
  contentHtml: string
}

export function PublicCmsPage({ title, contentHtml }: PublicCmsPageProps) {
  return (
    <Container className="py-10">
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle data-testid="public-page-title">{title}</CardTitle>
        </CardHeader>

        <CardContent>
          <article
            data-testid="public-page-content"
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </CardContent>
      </Card>
    </Container>
  )
}