import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminFulfillmentPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fulfillment</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Fulfillment workflows will be implemented in upcoming S16 stories.
        </p>
      </CardContent>
    </Card>
  )
}