import { FulfillmentTrackingClient } from "@/components/fulfillment/FulfillmentTrackingClient"

type PageProps = {
  params: Promise<{
    groupId: string
  }>
}

export default async function FulfillmentPage({ params }: PageProps) {
  const { groupId } = await params

  return <FulfillmentTrackingClient groupId={groupId} />
}