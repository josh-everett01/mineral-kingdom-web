import { ProtectedPage } from "@/components/auth/ProtectedPage"
import { SupportTicketThreadClient } from "@/components/support/SupportTicketThreadClient"
import { Container } from "@/components/site/Container"

type Props = {
  params: Promise<{ ticketId: string }>
}

export default async function SupportThreadPage({ params }: Props) {
  const { ticketId } = await params

  return (
    <div className="mk-preview-page min-h-screen overflow-x-hidden">
      <Container className="py-8 sm:py-10">
        <div className="mx-auto max-w-3xl">
          <ProtectedPage>
            <SupportTicketThreadClient ticketId={ticketId} />
          </ProtectedPage>
        </div>
      </Container>
    </div>
  )
}