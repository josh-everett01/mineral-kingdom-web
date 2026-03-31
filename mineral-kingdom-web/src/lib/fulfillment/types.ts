export type FulfillmentSnapshotDto = {
  fulfillmentGroupId: string
  status?: string | null
  carrier?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  packedAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  updatedAt?: string | null
}