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
    <div className="mk-preview-page min-h-screen overflow-x-hidden">
      <Container className="py-8 sm:py-10">
        <div className="mx-auto max-w-3xl">
          <SupportTicketThreadClient ticketId={ticketId} token={token} />
        </div>
      </Container>
    </div>
  )
}