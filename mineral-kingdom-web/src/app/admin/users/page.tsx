import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminUsersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Users workflows will be implemented in upcoming S16 stories.
        </p>
      </CardContent>
    </Card>
  )
}