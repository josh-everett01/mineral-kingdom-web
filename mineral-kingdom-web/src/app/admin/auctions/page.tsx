import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminAuctionsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Auctions</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Auctions workflows will be implemented in upcoming S16 stories.
        </p>
      </CardContent>
    </Card>
  )
}