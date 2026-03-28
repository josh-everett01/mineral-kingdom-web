import Link from "next/link"
import type { DashboardActionItem } from "@/lib/dashboard/types"

type Props = {
  items: DashboardActionItem[]
}

export function DashboardActionStrip({ items }: Props) {
  if (items.length === 0) return null

  return (
    <section
      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm"
      data-testid="dashboard-action-strip"
    >
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
            Action needed
          </p>
          <p className="text-sm text-amber-900">
            These are the next best actions for your account right now.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {items.map((item) => (
            <Link
              key={`${item.label}:${item.href}`}
              href={item.href}
              className={
                item.tone === "primary"
                  ? "inline-flex items-center justify-center rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
                  : "inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-50"
              }
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}