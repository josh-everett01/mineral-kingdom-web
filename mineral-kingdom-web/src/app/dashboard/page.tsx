import { Container } from "@/components/site/Container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
  return (
    <Container className="py-10">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Authenticated member dashboard placeholder.
        </CardContent>
      </Card>
    </Container>
  )
}