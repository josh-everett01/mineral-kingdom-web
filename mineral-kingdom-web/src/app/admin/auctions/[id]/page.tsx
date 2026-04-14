import { AdminAuctionDetailPage } from "@/components/admin/auctions/AdminAuctionDetailPage"

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <AdminAuctionDetailPage id={id} />
}