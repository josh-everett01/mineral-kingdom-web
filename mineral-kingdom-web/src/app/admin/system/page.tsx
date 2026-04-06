import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminSystemPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          System workflows will be implemented in upcoming S16 stories.
        </p>
      </CardContent>
    </Card>
  )
}