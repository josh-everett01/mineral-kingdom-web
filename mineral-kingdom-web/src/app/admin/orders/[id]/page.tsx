import { AdminOrderDetailPage } from "@/components/admin/orders/AdminOrderDetailPage"

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <AdminOrderDetailPage id={id} />
}