export type NotificationPreferencesDto = {
  outbidEmailEnabled: boolean
  auctionPaymentRemindersEnabled: boolean
  shippingInvoiceRemindersEnabled: boolean
  bidAcceptedEmailEnabled: boolean
  updatedAt?: string | null
}

export type UpdateNotificationPreferencesRequest = {
  outbidEmailEnabled?: boolean
  auctionPaymentRemindersEnabled?: boolean
  shippingInvoiceRemindersEnabled?: boolean
  bidAcceptedEmailEnabled?: boolean
}

export function normalizeNotificationPreferences(
  value: unknown,
): NotificationPreferencesDto | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const source = value as Record<string, unknown>

  return {
    outbidEmailEnabled: Boolean(source.outbidEmailEnabled),
    auctionPaymentRemindersEnabled: Boolean(source.auctionPaymentRemindersEnabled),
    shippingInvoiceRemindersEnabled: Boolean(source.shippingInvoiceRemindersEnabled),
    bidAcceptedEmailEnabled: Boolean(source.bidAcceptedEmailEnabled),
    updatedAt:
      typeof source.updatedAt === "string" || source.updatedAt == null
        ? (source.updatedAt as string | null | undefined)
        : null,
  }
}