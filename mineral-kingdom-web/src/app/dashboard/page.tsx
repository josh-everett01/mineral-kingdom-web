import { ProtectedPage } from "@/components/auth/ProtectedPage"
import { DashboardClient } from "@/components/dashboard/DashboardClient"
import { Container } from "@/components/site/Container"

export default function DashboardPage() {
  return (
    <Container className="py-10">
      <ProtectedPage>
        <DashboardClient />
      </ProtectedPage>
    </Container>
  )
}