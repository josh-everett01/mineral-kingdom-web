"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  getAdminAnalyticsAuctions,
  getAdminAnalyticsInventory,
  getAdminAnalyticsOperations,
  getAdminAnalyticsOverview,
  getAdminAnalyticsSales,
} from "@/lib/admin/analytics/api"
import type {
  AnalyticsOverview,
  AuctionDayPoint,
  InventoryStatus,
  SalesDayPoint,
} from "@/lib/admin/analytics/types"
import type { AdminSystemSummary } from "@/lib/admin/system/types"

function formatCurrency(cents: number | null | undefined) {
  const value = (cents ?? 0) / 100
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "—"
  return `${Math.round(value * 100)}%`
}

function formatDateLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function getDefaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - 29)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  return {
    from: fmt(from),
    to: fmt(to),
  }
}

function csvCell(value: string | number | null | undefined) {
  const str = value == null ? "" : String(value)
  const escaped = str.replaceAll('"', '""')
  return `"${escaped}"`
}

function downloadCsv(filename: string, lines: string[]) {
  const csv = lines.join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  URL.revokeObjectURL(url)
}

export function AdminAnalyticsPage() {
  const [range, setRange] = useState(getDefaultRange())
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [sales, setSales] = useState<SalesDayPoint[]>([])
  const [auctions, setAuctions] = useState<AuctionDayPoint[]>([])
  const [inventory, setInventory] = useState<InventoryStatus | null>(null)
  const [operations, setOperations] = useState<AdminSystemSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true)
        setError(null)

        const [overviewData, salesData, auctionsData, inventoryData, operationsData] =
          await Promise.all([
            getAdminAnalyticsOverview(range),
            getAdminAnalyticsSales(range),
            getAdminAnalyticsAuctions(range),
            getAdminAnalyticsInventory(),
            getAdminAnalyticsOperations(),
          ])

        setOverview(overviewData)
        setSales(salesData)
        setAuctions(auctionsData)
        setInventory(inventoryData)
        setOperations(operationsData)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load analytics.")
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [range])

  const salesChartData = useMemo(
    () =>
      sales.map((row) => ({
        label: formatDateLabel(row.dateUtc),
        grossSales: row.grossSalesCents / 100,
        orders: row.orderCount,
      })),
    [sales],
  )

  const auctionChartData = useMemo(
    () =>
      auctions.map((row) => ({
        label: formatDateLabel(row.dateUtc),
        sold: row.auctionsSold,
        unsold: row.auctionsUnsold,
        closed: row.auctionsClosed,
      })),
    [auctions],
  )

  function handleExportCsv() {
    if (!overview || !inventory || !operations) return

    const generatedAt = new Date().toISOString()
    const lines: string[] = []

    lines.push([csvCell("Mineral Kingdom Analytics Export")].join(","))
    lines.push([csvCell("GeneratedAtUtc"), csvCell(generatedAt)].join(","))
    lines.push([csvCell("From"), csvCell(range.from), csvCell("To"), csvCell(range.to)].join(","))
    lines.push("")

    lines.push([csvCell("Summary")].join(","))
    lines.push([csvCell("Metric"), csvCell("Value")].join(","))
    lines.push([csvCell("Paid sales cents"), csvCell(overview.sales.grossSalesCents)].join(","))
    lines.push([csvCell("Paid orders"), csvCell(overview.sales.orderCount)].join(","))
    lines.push([csvCell("Paid order AOV cents"), csvCell(overview.sales.aovCents)].join(","))
    lines.push([csvCell("Paid store revenue cents"), csvCell(overview.sales.storeSalesCents)].join(","))
    lines.push([csvCell("Paid auction revenue cents"), csvCell(overview.sales.auctionSalesCents)].join(","))
    lines.push([csvCell("Auctions closed"), csvCell(overview.auctions.auctionsClosed)].join(","))
    lines.push([csvCell("Auctions sold"), csvCell(overview.auctions.auctionsSold)].join(","))
    lines.push([csvCell("Auctions unsold"), csvCell(overview.auctions.auctionsUnsold)].join(","))
    lines.push([csvCell("Avg final price cents"), csvCell(overview.auctions.avgFinalPriceCents)].join(","))
    lines.push([csvCell("Avg bids per auction"), csvCell(overview.auctions.avgBidsPerAuction)].join(","))
    lines.push([csvCell("Reserve met rate"), csvCell(overview.auctions.reserveMetRate)].join(","))
    lines.push([csvCell("Payment completion rate"), csvCell(overview.auctions.paymentCompletionRate)].join(","))
    lines.push("")

    lines.push([csvCell("Sales time series")].join(","))
    lines.push(
      [
        csvCell("DateUtc"),
        csvCell("GrossSalesCents"),
        csvCell("OrderCount"),
        csvCell("AovCents"),
        csvCell("StoreSalesCents"),
        csvCell("AuctionSalesCents"),
      ].join(","),
    )
    for (const row of sales) {
      lines.push(
        [
          csvCell(row.dateUtc),
          csvCell(row.grossSalesCents),
          csvCell(row.orderCount),
          csvCell(row.aovCents),
          csvCell(row.storeSalesCents),
          csvCell(row.auctionSalesCents),
        ].join(","),
      )
    }
    lines.push("")

    lines.push([csvCell("Auction time series")].join(","))
    lines.push(
      [
        csvCell("DateUtc"),
        csvCell("AuctionsClosed"),
        csvCell("AuctionsSold"),
        csvCell("AuctionsUnsold"),
        csvCell("AvgFinalPriceCents"),
        csvCell("AvgBidsPerAuction"),
        csvCell("ReserveMetRate"),
        csvCell("PaymentCompletionRate"),
      ].join(","),
    )
    for (const row of auctions) {
      lines.push(
        [
          csvCell(row.dateUtc),
          csvCell(row.auctionsClosed),
          csvCell(row.auctionsSold),
          csvCell(row.auctionsUnsold),
          csvCell(row.avgFinalPriceCents),
          csvCell(row.avgBidsPerAuction),
          csvCell(row.reserveMetRate),
          csvCell(row.paymentCompletionRate),
        ].join(","),
      )
    }
    lines.push("")

    lines.push([csvCell("Inventory snapshot")].join(","))
    lines.push([csvCell("Metric"), csvCell("Value")].join(","))
    lines.push([csvCell("Published listings"), csvCell(inventory.publishedListings)].join(","))
    lines.push([csvCell("Low stock listings"), csvCell(inventory.lowStockListings)].join(","))
    lines.push([csvCell("Active auctions"), csvCell(inventory.activeAuctions)].join(","))
    lines.push([csvCell("Auctions ending soon"), csvCell(inventory.auctionsEndingSoon)].join(","))
    lines.push("")

    lines.push([csvCell("Operational snapshot")].join(","))
    lines.push([csvCell("Metric"), csvCell("Value")].join(","))
    lines.push([csvCell("Pending jobs"), csvCell(operations.pendingJobs)].join(","))
    lines.push([csvCell("Running jobs"), csvCell(operations.runningJobs)].join(","))
    lines.push([csvCell("DLQ jobs"), csvCell(operations.deadLetterJobs)].join(","))
    lines.push([csvCell("Recent failed jobs"), csvCell(operations.recentFailedJobs)].join(","))
    lines.push([csvCell("Unprocessed webhooks"), csvCell(operations.unprocessedWebhookEvents)].join(","))
    lines.push([csvCell("Last webhook received"), csvCell(operations.lastWebhookReceivedAt)].join(","))
    lines.push([csvCell("Last webhook processed"), csvCell(operations.lastWebhookProcessedAt)].join(","))

    downloadCsv(`analytics-report-${range.from}-to-${range.to}.csv`, lines)
  }

  function handlePrint() {
    window.print()
  }

  if (isLoading) {
    return (
      <div
        data-testid="admin-analytics-page"
        className="rounded-xl border bg-card p-6 text-sm text-muted-foreground"
      >
        Loading analytics…
      </div>
    )
  }

  return (
    <div
      data-testid="admin-analytics-page"
      className="space-y-6 print:space-y-4 print:bg-white print:text-black"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 print:block">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold print:text-3xl">Analytics</h1>
          <p className="text-sm text-muted-foreground print:text-black">
            Lightweight sales, auction, inventory, and operations overview.
          </p>
          <p className="hidden text-xs text-muted-foreground print:block print:text-black">
            Report range: {range.from} through {range.to}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
            <input
              type="date"
              value={range.from}
              onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
            <input
              type="date"
              value={range.to}
              onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            data-testid="admin-analytics-export-csv"
            onClick={handleExportCsv}
            disabled={!overview || !inventory || !operations}
            className="inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
          <button
            type="button"
            data-testid="admin-analytics-print"
            onClick={handlePrint}
            className="inline-flex rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive print:hidden">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 print:grid-cols-5">
        <section className="rounded-xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">Paid sales</div>
          <div data-testid="admin-analytics-kpi-gross-sales" className="mt-2 text-2xl font-semibold">
            {formatCurrency(overview?.sales.grossSalesCents)}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">Paid orders</div>
          <div data-testid="admin-analytics-kpi-orders" className="mt-2 text-2xl font-semibold">
            {overview?.sales.orderCount ?? 0}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">Paid order AOV</div>
          <div data-testid="admin-analytics-kpi-aov" className="mt-2 text-2xl font-semibold">
            {formatCurrency(overview?.sales.aovCents)}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">Auctions sold</div>
          <div data-testid="admin-analytics-kpi-auctions-sold" className="mt-2 text-2xl font-semibold">
            {overview?.auctions.auctionsSold ?? 0}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="text-sm text-muted-foreground">Sell-through</div>
          <div data-testid="admin-analytics-kpi-sell-through" className="mt-2 text-2xl font-semibold">
            {overview
              ? formatPercent(
                overview.auctions.auctionsClosed > 0
                  ? overview.auctions.auctionsSold / overview.auctions.auctionsClosed
                  : 0,
              )
              : "—"}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2 print:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 break-inside-avoid">
          <h2 className="mb-4 text-lg font-semibold">Sales over time</h2>
          <div data-testid="admin-analytics-sales-chart" className="h-[320px] print:h-[260px]">
            {salesChartData.length === 0 ? (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                Not enough data to display chart yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="grossSales" name="Paid sales ($)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 break-inside-avoid">
          <h2 className="mb-4 text-lg font-semibold">Auctions over time</h2>
          <div data-testid="admin-analytics-auctions-chart" className="h-[320px] print:h-[260px]">
            {auctionChartData.length === 0 ? (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                Not enough data to display chart yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={auctionChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sold" name="Sold" />
                  <Bar dataKey="unsold" name="Unsold" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2 print:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 break-inside-avoid">
          <h2 className="mb-4 text-lg font-semibold">Revenue and auction summary</h2>
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Paid store revenue</dt>
              <dd>{formatCurrency(overview?.sales.storeSalesCents)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Paid auction revenue</dt>
              <dd>{formatCurrency(overview?.sales.auctionSalesCents)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Auctions closed</dt>
              <dd>{overview?.auctions.auctionsClosed ?? 0}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Avg final price</dt>
              <dd>{formatCurrency(overview?.auctions.avgFinalPriceCents)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Payment completion rate</dt>
              <dd>{formatPercent(overview?.auctions.paymentCompletionRate)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border bg-card p-5 break-inside-avoid">
          <h2 className="mb-4 text-lg font-semibold">Inventory snapshot</h2>
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Published listings</dt>
              <dd>{inventory?.publishedListings ?? 0}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Low stock listings</dt>
              <dd>{inventory?.lowStockListings ?? 0}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Active auctions</dt>
              <dd>{inventory?.activeAuctions ?? 0}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Auctions ending soon</dt>
              <dd>{inventory?.auctionsEndingSoon ?? 0}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-xl border bg-card p-5 break-inside-avoid">
        <h2 className="mb-4 text-lg font-semibold">Operational snapshot</h2>
        <div data-testid="admin-analytics-operations" className="grid gap-4 md:grid-cols-4 print:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Pending jobs</div>
            <div className="mt-2 text-xl font-semibold">{operations?.pendingJobs ?? 0}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Running jobs</div>
            <div className="mt-2 text-xl font-semibold">{operations?.runningJobs ?? 0}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">DLQ jobs</div>
            <div className="mt-2 text-xl font-semibold">{operations?.deadLetterJobs ?? 0}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Unprocessed webhooks</div>
            <div className="mt-2 text-xl font-semibold">{operations?.unprocessedWebhookEvents ?? 0}</div>
          </div>
        </div>
      </section>
    </div>
  )
}