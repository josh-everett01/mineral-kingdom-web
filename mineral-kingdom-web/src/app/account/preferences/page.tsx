import { NotificationPreferencesClient } from "@/components/account/NotificationPreferencesClient"
import { Container } from "@/components/site/Container"

export default function AccountPreferencesPage() {
  return (
    <Container className="py-8 sm:py-10">
      <NotificationPreferencesClient />
    </Container>
  )
}