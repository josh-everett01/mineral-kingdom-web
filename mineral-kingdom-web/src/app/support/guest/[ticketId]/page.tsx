import { SupportTicketThreadClient } from "@/components/support/SupportTicketThreadClient"
import { Container } from "@/components/site/Container"

type Props = {
  params: Promise<{ ticketId: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function GuestSupportThreadPage({ params, searchParams }: Props) {
  const { ticketId } = await params
  const { token } = await searchParams

  return (
    <Container className="py-10 max-w-3xl">
      <SupportTicketThreadClient ticketId={ticketId} token={token} />
    </Container>
  )
}
