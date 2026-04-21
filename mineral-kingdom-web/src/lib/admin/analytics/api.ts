import type {
  AnalyticsOverview,
  AuctionDayPoint,
  InventoryStatus,
  SalesDayPoint,
} from "@/lib/admin/analytics/types"
import type { AdminSystemSummary } from "@/lib/admin/system/types"

export type AnalyticsRange = {
  from: string
  to: string
}

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

function toSearch(range: AnalyticsRange) {
  const search = new URLSearchParams()
  search.set("from", range.from)
  search.set("to", range.to)
  return search.toString()
}

export async function getAdminAnalyticsOverview(range: AnalyticsRange): Promise<AnalyticsOverview> {
  const response = await fetch(`/api/bff/admin/analytics/overview?${toSearch(range)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<AnalyticsOverview>(response, "Failed to load analytics overview.")
}

export async function getAdminAnalyticsSales(range: AnalyticsRange): Promise<SalesDayPoint[]> {
  const response = await fetch(`/api/bff/admin/analytics/sales/timeseries?${toSearch(range)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<SalesDayPoint[]>(response, "Failed to load analytics sales data.")
}

export async function getAdminAnalyticsAuctions(range: AnalyticsRange): Promise<AuctionDayPoint[]> {
  const response = await fetch(`/api/bff/admin/analytics/auctions/timeseries?${toSearch(range)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<AuctionDayPoint[]>(response, "Failed to load analytics auctions data.")
}

export async function getAdminAnalyticsInventory(): Promise<InventoryStatus> {
  const response = await fetch("/api/bff/admin/analytics/inventory/status", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<InventoryStatus>(response, "Failed to load inventory analytics.")
}

export async function getAdminAnalyticsOperations(): Promise<AdminSystemSummary> {
  const response = await fetch("/api/bff/admin/system/summary", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  return readJson<AdminSystemSummary>(response, "Failed to load operations snapshot.")
}