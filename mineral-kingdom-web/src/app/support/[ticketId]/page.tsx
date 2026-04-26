import { ProtectedPage } from "@/components/auth/ProtectedPage"
import { SupportTicketThreadClient } from "@/components/support/SupportTicketThreadClient"
import { Container } from "@/components/site/Container"

type Props = {
  params: Promise<{ ticketId: string }>
}

export default async function SupportThreadPage({ params }: Props) {
  const { ticketId } = await params

  return (
    <Container className="py-10 max-w-3xl">
      <ProtectedPage>
        <SupportTicketThreadClient ticketId={ticketId} />
      </ProtectedPage>
    </Container>
  )
}
