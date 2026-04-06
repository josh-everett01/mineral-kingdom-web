import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminStoreOffersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Offers</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Store offer pricing, discount, and activation workflows land in S16-4.
        </p>
      </CardContent>
    </Card>
  )
}