import { AdminSupportTicketDetailPage } from '@/components/admin/support/AdminSupportTicketDetailPage..'

type Props = {
  params: Promise<{ ticketId: string }>
}

export default async function Page({ params }: Props) {
  const { ticketId } = await params
  return <AdminSupportTicketDetailPage ticketId={ticketId} />
}