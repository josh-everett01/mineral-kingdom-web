import type {
  AdminSystemJobs,
  AdminSystemSummary,
  AdminSystemWebhooks,
} from "@/lib/admin/system/types"

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    let message = fallbackMessage

    try {
      const body = await response.json()
      message = body?.message ?? body?.details?.error ?? body?.error ?? message
    } catch {
      // ignore
    }

    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export async function getAdminSystemSummary(): Promise<AdminSystemSummary> {
  const response = await fetch("/api/bff/admin/system/summary", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<AdminSystemSummary>(response, "Failed to load system summary.")
}

export async function getAdminSystemJobs(): Promise<AdminSystemJobs> {
  const response = await fetch("/api/bff/admin/system/jobs", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<AdminSystemJobs>(response, "Failed to load system jobs.")
}

export async function getAdminSystemWebhooks(): Promise<AdminSystemWebhooks> {
  const response = await fetch("/api/bff/admin/system/webhooks", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<AdminSystemWebhooks>(response, "Failed to load system webhooks.")
}