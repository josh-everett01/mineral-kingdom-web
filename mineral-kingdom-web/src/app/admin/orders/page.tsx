import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminOrdersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Orders workflows will be implemented in upcoming S16 stories.
        </p>
      </CardContent>
    </Card>
  )
}