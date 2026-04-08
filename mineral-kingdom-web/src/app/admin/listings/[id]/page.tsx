import { AdminListingEditorPage } from "@/components/admin/listings/AdminListingEditorPage"

type AdminListingDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminListingDetailPage(props: AdminListingDetailPageProps) {
  const { id } = await props.params

  return <AdminListingEditorPage id={id} />
}