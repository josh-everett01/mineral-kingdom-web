import { Container } from "@/components/site/Container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RoleGate } from "@/components/auth/RoleGate"
import { getCurrentSession } from "@/lib/auth/session"

export default async function AdminPage() {
  const session = await getCurrentSession()

  return (
    <Container className="py-10">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Admin</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="text-sm font-medium">Listings Management</div>
            <p className="text-sm text-muted-foreground">
              Restricted to STAFF and OWNER roles.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button data-testid="admin-edit-listings-action" type="button" variant="secondary">
              Edit listings
            </Button>

            <RoleGate userRoles={session.roles} allowedRoles={["OWNER"]}>
              <Button data-testid="admin-owner-only-action" type="button">
                Manage admin roles
              </Button>
            </RoleGate>
          </div>
        </CardContent>
      </Card>
    </Container>
  )
}