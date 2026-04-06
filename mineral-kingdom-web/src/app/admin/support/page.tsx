import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminSupportPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Support</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Support workflows will be implemented in upcoming S16 stories.
        </p>
      </CardContent>
    </Card>
  )
}