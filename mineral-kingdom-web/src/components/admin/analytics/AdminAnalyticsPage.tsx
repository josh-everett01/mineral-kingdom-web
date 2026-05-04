"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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

const adminInputClass =
  "rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-3 py-2 text-sm text-[color:var(--mk-ink)] outline-none transition focus:border-[color:var(--mk-border-strong)] focus:ring-2 focus:ring-[color:var(--mk-amethyst)]/20"

const adminSecondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)] disabled:cursor-not-allowed disabled:opacity-60"

const chartAxisTick = {
  fill: "currentColor",
  fontSize: 11,
}

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

function hasSalesActivity(row: SalesDayPoint) {
  return (
    row.grossSalesCents > 0 ||
    row.orderCount > 0 ||
    row.aovCents > 0 ||
    row.storeSalesCents > 0 ||
    row.auctionSalesCents > 0
  )
}

function hasAuctionActivity(row: AuctionDayPoint) {
  return (
    row.auctionsClosed > 0 ||
    row.auctionsSold > 0 ||
    row.auctionsUnsold > 0 ||
    (row.avgFinalPriceCents ?? 0) > 0 ||
    (row.avgBidsPerAuction ?? 0) > 0
  )
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

function usePrintMode() {
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    const beforePrint = () => setIsPrinting(true)
    const afterPrint = () => setIsPrinting(false)

    window.addEventListener("beforeprint", beforePrint)
    window.addEventListener("afterprint", afterPrint)

    const mediaQuery = window.matchMedia("print")

    function handleMediaChange(event: MediaQueryListEvent) {
      setIsPrinting(event.matches)
    }

    mediaQuery.addEventListener("change", handleMediaChange)

    return () => {
      window.removeEventListener("beforeprint", beforePrint)
      window.removeEventListener("afterprint", afterPrint)
      mediaQuery.removeEventListener("change", handleMediaChange)
    }
  }, [])

  return isPrinting
}

function useElementSize() {
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!element) {
      return
    }

    const node: HTMLDivElement = element
    let frame = 0

    function updateSize() {
      window.cancelAnimationFrame(frame)

      frame = window.requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect()

        const nextWidth = Math.floor(rect.width)
        const nextHeight = Math.floor(rect.height)

        setSize((current) => {
          const width = nextWidth > 0 ? nextWidth : 0
          const height = nextHeight > 0 ? nextHeight : 0

          if (current.width === width && current.height === height) {
            return current
          }

          return { width, height }
        })
      })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(node)

    window.addEventListener("resize", updateSize)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener("resize", updateSize)
    }
  }, [element])

  return {
    setElement,
    width: size.width,
    height: size.height,
    hasPositiveSize: size.width > 10 && size.height > 10,
  }
}

function KpiCard({
  label,
  value,
  testId,
}: {
  label: string
  value: string | number
  testId: string
}) {
  return (
    <section className="mk-glass-strong rounded-[2rem] p-5 print:rounded-xl print:border print:border-black/15 print:bg-white print:p-3 print:text-black print:shadow-none">
      <div className="text-sm mk-muted-text print:text-[10px] print:leading-tight print:text-black">
        {label}
      </div>
      <div
        data-testid={testId}
        className="mt-2 text-2xl font-semibold text-[color:var(--mk-ink)] print:mt-1 print:text-lg print:leading-tight print:text-black"
      >
        {value}
      </div>
    </section>
  )
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-4 py-3 print:rounded-none print:border-0 print:border-b print:border-black/10 print:bg-white print:px-0 print:py-1.5">
      <dt className="mk-muted-text print:text-xs print:text-black">{label}</dt>
      <dd className="font-semibold text-[color:var(--mk-ink)] print:text-xs print:text-black">
        {value}
      </dd>
    </div>
  )
}

function OperationCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 print:rounded-xl print:border print:border-black/15 print:bg-white print:p-3">
      <div className="text-sm mk-muted-text print:text-[10px] print:leading-tight print:text-black">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-[color:var(--mk-ink)] print:mt-1 print:text-base print:leading-tight print:text-black">
        {value}
      </div>
    </div>
  )
}

function SalesDetailTable({ sales }: { sales: SalesDayPoint[] }) {
  return (
    <div className="mk-analytics-print-table-wrap">
      <h3 className="mb-2 text-sm font-semibold text-[color:var(--mk-ink)] print:text-black">
        Sales time series
      </h3>

      <table className="mk-analytics-print-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Paid sales</th>
            <th>Orders</th>
            <th>AOV</th>
            <th>Store revenue</th>
            <th>Auction revenue</th>
          </tr>
        </thead>
        <tbody>
          {sales.length === 0 ? (
            <tr>
              <td colSpan={6}>No sales activity found for this range.</td>
            </tr>
          ) : (
            sales.map((row) => (
              <tr key={row.dateUtc}>
                <td>{formatDateLabel(row.dateUtc)}</td>
                <td>{formatCurrency(row.grossSalesCents)}</td>
                <td>{row.orderCount}</td>
                <td>{formatCurrency(row.aovCents)}</td>
                <td>{formatCurrency(row.storeSalesCents)}</td>
                <td>{formatCurrency(row.auctionSalesCents)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function AuctionDetailTable({ auctions }: { auctions: AuctionDayPoint[] }) {
  return (
    <div className="mk-analytics-print-table-wrap">
      <h3 className="mb-2 text-sm font-semibold text-[color:var(--mk-ink)] print:text-black">
        Auction time series
      </h3>

      <table className="mk-analytics-print-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Closed</th>
            <th>Sold</th>
            <th>Unsold</th>
            <th>Avg final price</th>
            <th>Avg bids</th>
            <th>Reserve met</th>
            <th>Payment completion</th>
          </tr>
        </thead>
        <tbody>
          {auctions.length === 0 ? (
            <tr>
              <td colSpan={8}>No auction activity found for this range.</td>
            </tr>
          ) : (
            auctions.map((row) => (
              <tr key={row.dateUtc}>
                <td>{formatDateLabel(row.dateUtc)}</td>
                <td>{row.auctionsClosed}</td>
                <td>{row.auctionsSold}</td>
                <td>{row.auctionsUnsold}</td>
                <td>{formatCurrency(row.avgFinalPriceCents)}</td>
                <td>{row.avgBidsPerAuction ?? "—"}</td>
                <td>{formatPercent(row.reserveMetRate)}</td>
                <td>{formatPercent(row.paymentCompletionRate)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function SalesChartSection({
  salesChartData,
}: {
  salesChartData: Array<{
    label: string
    grossSales: number
    orders: number
  }>
}) {
  const { setElement, width, height, hasPositiveSize } = useElementSize()

  return (
    <section className="mk-glass-strong rounded-[2rem] p-5">
      <h2 className="mb-4 text-lg font-semibold text-[color:var(--mk-ink)]">
        Sales over time
      </h2>

      <div
        ref={setElement}
        data-testid="admin-analytics-sales-chart"
        className="relative h-80 min-h-80 w-full min-w-0 overflow-hidden text-[color:var(--mk-ink)]"
      >
        {salesChartData.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm mk-muted-text">
            Not enough data to display chart yet.
          </div>
        ) : hasPositiveSize ? (
          <AreaChart
            width={width}
            height={height}
            data={salesChartData}
            margin={{ top: 10, right: 18, left: 0, bottom: 28 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.22} />
            <XAxis
              dataKey="label"
              interval="preserveStartEnd"
              tick={chartAxisTick}
              tickMargin={8}
            />
            <YAxis tick={chartAxisTick} width={36} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="grossSales"
              name="Paid sales ($)"
              stroke="#38bdf8"
              fill="#38bdf8"
              fillOpacity={0.45}
            />
          </AreaChart>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-sm mk-muted-text">
            Preparing chart…
          </div>
        )}
      </div>
    </section>
  )
}

function AuctionChartSection({
  auctionChartData,
}: {
  auctionChartData: Array<{
    label: string
    sold: number
    unsold: number
    closed: number
  }>
}) {
  const { setElement, width, height, hasPositiveSize } = useElementSize()

  return (
    <section className="mk-glass-strong rounded-[2rem] p-5">
      <h2 className="mb-4 text-lg font-semibold text-[color:var(--mk-ink)]">
        Auctions over time
      </h2>

      <div
        ref={setElement}
        data-testid="admin-analytics-auctions-chart"
        className="relative h-80 min-h-80 w-full min-w-0 overflow-hidden text-[color:var(--mk-ink)]"
      >
        {auctionChartData.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4 text-sm mk-muted-text">
            Not enough data to display chart yet.
          </div>
        ) : hasPositiveSize ? (
          <BarChart
            width={width}
            height={height}
            data={auctionChartData}
            margin={{ top: 10, right: 18, left: 0, bottom: 28 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.22} />
            <XAxis
              dataKey="label"
              interval="preserveStartEnd"
              tick={chartAxisTick}
              tickMargin={8}
            />
            <YAxis tick={chartAxisTick} width={36} />
            <Tooltip />
            <Bar dataKey="sold" name="Sold" fill="#f59e0b" />
            <Bar dataKey="unsold" name="Unsold" fill="#a855f7" />
          </BarChart>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-sm mk-muted-text">
            Preparing chart…
          </div>
        )}
      </div>
    </section>
  )
}

export function AdminAnalyticsPage() {
  const isPrinting = usePrintMode()
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

  const salesDetailRows = useMemo(() => sales.filter(hasSalesActivity), [sales])

  const auctionDetailRows = useMemo(
    () => auctions.filter(hasAuctionActivity),
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
    setTimeout(() => window.print(), 0)
  }

  if (isLoading) {
    return (
      <div
        data-testid="admin-analytics-page"
        className="mk-glass-strong rounded-[2rem] p-6 text-sm mk-muted-text"
      >
        Loading analytics…
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.45in;
          }

          footer {
            display: none !important;
          }

          [data-testid="admin-analytics-page"] {
            background: #ffffff !important;
            color: #000000 !important;
          }

          [data-testid="admin-analytics-page"] .mk-glass,
          [data-testid="admin-analytics-page"] .mk-glass-strong {
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          .mk-analytics-print-hidden {
            display: none !important;
          }

          .mk-analytics-print-summary {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .mk-analytics-print-detail {
            break-before: page !important;
            page-break-before: always !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
            overflow: visible !important;
          }

          .mk-analytics-print-table-wrap {
            overflow: visible !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          .mk-analytics-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 8.5px !important;
            line-height: 1.2 !important;
          }

          .mk-analytics-print-table thead {
            display: table-header-group !important;
          }

          .mk-analytics-print-table tbody {
            display: table-row-group !important;
          }

          .mk-analytics-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .mk-analytics-print-table th,
          .mk-analytics-print-table td {
            border: 1px solid rgba(0, 0, 0, 0.18) !important;
            padding: 3px 4px !important;
            text-align: left !important;
            vertical-align: top !important;
          }
        }
      `}</style>

      <div
        data-testid="admin-analytics-page"
        className="space-y-6 print:space-y-3 print:bg-white print:text-black"
      >
        <div className="mk-analytics-print-summary space-y-6 print:space-y-3">
          <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7 print:rounded-none print:border-0 print:border-b print:border-black/20 print:bg-white print:p-0 print:pb-2 print:shadow-none">
            <div className="flex flex-wrap items-end justify-between gap-4 print:block">
              <div className="print:space-y-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)] print:text-[9px] print:leading-tight print:text-black">
                  Mineral Kingdom
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)] print:mt-0 print:text-xl print:leading-tight print:text-black">
                  Analytics Report
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text print:mt-0.5 print:block print:text-[10px] print:leading-tight print:text-black">
                  Report range: {range.from} through {range.to}
                </p>

                <p className="hidden text-xs mk-muted-text print:mt-0.5 print:block print:text-[10px] print:leading-tight print:text-black">
                  Generated: {new Date().toLocaleString()}
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-3 print:hidden">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[color:var(--mk-gold)]">
                    From
                  </label>
                  <input
                    type="date"
                    value={range.from}
                    onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
                    className={adminInputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[color:var(--mk-gold)]">
                    To
                  </label>
                  <input
                    type="date"
                    value={range.to}
                    onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
                    className={adminInputClass}
                  />
                </div>

                <button
                  type="button"
                  data-testid="admin-analytics-export-csv"
                  onClick={handleExportCsv}
                  disabled={!overview || !inventory || !operations}
                  className={adminSecondaryButtonClass}
                >
                  Export CSV
                </button>

                <button
                  type="button"
                  data-testid="admin-analytics-print"
                  onClick={handlePrint}
                  className={adminSecondaryButtonClass}
                >
                  Print / Save PDF
                </button>
              </div>
            </div>
          </section>

          {error ? (
            <div className="rounded-[2rem] border border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] p-5 text-sm text-[color:var(--mk-danger)] print:hidden">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 print:grid-cols-5 print:gap-2">
            <KpiCard
              label="Paid sales"
              value={formatCurrency(overview?.sales.grossSalesCents)}
              testId="admin-analytics-kpi-gross-sales"
            />
            <KpiCard
              label="Paid orders"
              value={overview?.sales.orderCount ?? 0}
              testId="admin-analytics-kpi-orders"
            />
            <KpiCard
              label="Paid order AOV"
              value={formatCurrency(overview?.sales.aovCents)}
              testId="admin-analytics-kpi-aov"
            />
            <KpiCard
              label="Auctions sold"
              value={overview?.auctions.auctionsSold ?? 0}
              testId="admin-analytics-kpi-auctions-sold"
            />
            <KpiCard
              label="Sell-through"
              value={
                overview
                  ? formatPercent(
                    overview.auctions.auctionsClosed > 0
                      ? overview.auctions.auctionsSold / overview.auctions.auctionsClosed
                      : 0,
                  )
                  : "—"
              }
              testId="admin-analytics-kpi-sell-through"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2 print:grid-cols-2 print:gap-3">
            <section className="mk-glass-strong rounded-[2rem] p-5 break-inside-avoid print:rounded-xl print:border print:border-black/15 print:bg-white print:p-3 print:shadow-none">
              <h2 className="mb-4 text-lg font-semibold text-[color:var(--mk-ink)] print:mb-2 print:text-sm print:text-black">
                Revenue and auction summary
              </h2>
              <dl className="grid gap-3 text-sm print:gap-0">
                <MetricRow
                  label="Paid store revenue"
                  value={formatCurrency(overview?.sales.storeSalesCents)}
                />
                <MetricRow
                  label="Paid auction revenue"
                  value={formatCurrency(overview?.sales.auctionSalesCents)}
                />
                <MetricRow
                  label="Auctions closed"
                  value={overview?.auctions.auctionsClosed ?? 0}
                />
                <MetricRow
                  label="Auctions sold"
                  value={overview?.auctions.auctionsSold ?? 0}
                />
                <MetricRow
                  label="Auctions unsold"
                  value={overview?.auctions.auctionsUnsold ?? 0}
                />
                <MetricRow
                  label="Avg final price"
                  value={formatCurrency(overview?.auctions.avgFinalPriceCents)}
                />
                <MetricRow
                  label="Payment completion rate"
                  value={formatPercent(overview?.auctions.paymentCompletionRate)}
                />
              </dl>
            </section>

            <section className="mk-glass-strong rounded-[2rem] p-5 break-inside-avoid print:rounded-xl print:border print:border-black/15 print:bg-white print:p-3 print:shadow-none">
              <h2 className="mb-4 text-lg font-semibold text-[color:var(--mk-ink)] print:mb-2 print:text-sm print:text-black">
                Inventory snapshot
              </h2>
              <dl className="grid gap-3 text-sm print:gap-0">
                <MetricRow label="Published listings" value={inventory?.publishedListings ?? 0} />
                <MetricRow label="Low stock listings" value={inventory?.lowStockListings ?? 0} />
                <MetricRow label="Active auctions" value={inventory?.activeAuctions ?? 0} />
                <MetricRow
                  label="Auctions ending soon"
                  value={inventory?.auctionsEndingSoon ?? 0}
                />
              </dl>
            </section>
          </div>

          <section className="mk-glass-strong rounded-[2rem] p-5 break-inside-avoid print:rounded-xl print:border print:border-black/15 print:bg-white print:p-3 print:shadow-none">
            <h2 className="mb-4 text-lg font-semibold text-[color:var(--mk-ink)] print:mb-2 print:text-sm print:text-black">
              Operational snapshot
            </h2>
            <div
              data-testid="admin-analytics-operations"
              className="grid gap-4 md:grid-cols-4 print:grid-cols-4 print:gap-2"
            >
              <OperationCard label="Pending jobs" value={operations?.pendingJobs ?? 0} />
              <OperationCard label="Running jobs" value={operations?.runningJobs ?? 0} />
              <OperationCard label="DLQ jobs" value={operations?.deadLetterJobs ?? 0} />
              <OperationCard
                label="Unprocessed webhooks"
                value={operations?.unprocessedWebhookEvents ?? 0}
              />
            </div>
          </section>
        </div>

        {!isPrinting ? (
          <div className="mk-analytics-print-hidden grid gap-6 xl:grid-cols-2">
            <SalesChartSection salesChartData={salesChartData} />
            <AuctionChartSection auctionChartData={auctionChartData} />
          </div>
        ) : null}

        <section className="mk-analytics-print-detail hidden space-y-4 print:block print:space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)] print:text-[9px] print:text-black">
              Mineral Kingdom
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[color:var(--mk-ink)] print:text-xl print:text-black">
              Analytics Detail
            </h2>
            <p className="mt-1 text-sm mk-muted-text print:text-[10px] print:text-black">
              Time-series detail for {range.from} through {range.to}
            </p>
          </div>

          <SalesDetailTable sales={salesDetailRows} />

          <AuctionDetailTable auctions={auctionDetailRows} />
        </section>
      </div>
    </>
  )
}