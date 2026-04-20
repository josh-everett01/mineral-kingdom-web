import { AdminCmsEditorPage } from "@/components/admin/cms/AdminCmsEditorPage"

type Props = {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return <AdminCmsEditorPage slug={slug} />
}