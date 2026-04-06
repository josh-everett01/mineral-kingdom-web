import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminListingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Listings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Listing editor workflows land in S16-2.</p>
      </CardContent>
    </Card>
  )
}