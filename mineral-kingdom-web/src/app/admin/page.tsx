import { Container } from "@/components/site/Container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminPage() {
  return (
    <Container className="py-10">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Admin</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Restricted to STAFF and OWNER roles.
        </CardContent>
      </Card>
    </Container>
  )
}