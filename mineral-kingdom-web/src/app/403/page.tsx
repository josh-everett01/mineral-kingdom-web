import Link from "next/link"
import { Container } from "@/components/site/Container"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ForbiddenPage() {
  return (
    <Container className="py-12">
      <Card className="mx-auto max-w-2xl" data-testid="forbidden-page">
        <CardHeader>
          <CardTitle>403 — Access denied</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p data-testid="forbidden-message">
            Your account is signed in, but you do not have permission to view this area.
          </p>
          <p>
            If you believe you should have access, please contact an administrator or request the
            appropriate role.
          </p>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Back home</Link>
          </Button>

          <Button asChild variant="secondary">
            <Link href="/account">Go to account</Link>
          </Button>
        </CardFooter>
      </Card>
    </Container>
  )
}