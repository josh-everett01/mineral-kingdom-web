export type AdminSystemSummary = {
  appHealthy: boolean
  databaseReachable: boolean
  pendingJobs: number
  runningJobs: number
  deadLetterJobs: number
  recentFailedJobs: number
  unprocessedWebhookEvents: number
  lastWebhookReceivedAt: string | null
  lastWebhookProcessedAt: string | null
}

export type AdminJobCounts = {
  pending: number
  running: number
  deadLetter: number
}

export type AdminJobListItem = {
  id: string
  type: string
  status: string
  attempts: number
  maxAttempts: number
  lastError: string | null
  runAt: string
  lockedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AdminSystemJobs = {
  counts: AdminJobCounts
  recentErrors: AdminJobListItem[]
}

export type AdminWebhookEventListItem = {
  provider: string
  eventId: string
  receivedAt: string
  processedAt: string | null
}

export type AdminSystemWebhooks = {
  unprocessedCount: number
  oldestUnprocessedReceivedAt: string | null
  recentEvents: AdminWebhookEventListItem[]
}

export type SystemHealthResponse = {
  status?: string
  [key: string]: unknown
}

export type DatabasePingResponse = {
  status?: string
  ok?: boolean
  [key: string]: unknown
}