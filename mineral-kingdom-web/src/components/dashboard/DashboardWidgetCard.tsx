import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardWidgetModel } from "@/lib/dashboard/types"

type Props = {
  testId: string
  model: DashboardWidgetModel
}

export function DashboardWidgetCard({ testId, model }: Props) {
  return (
    <Card className="h-full" data-testid={testId}>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>{model.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{model.description}</p>
          </div>

          <div className="rounded-xl bg-stone-100 px-3 py-2 text-right">
            <div className="text-2xl font-bold tracking-tight text-stone-900">
              {model.countValue}
            </div>
            <div className="text-xs font-medium uppercase tracking-wide text-stone-500">
              {model.countLabel}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {model.rows.length === 0 ? (
          <p className="text-sm text-stone-600">{model.emptyMessage}</p>
        ) : (
          <ul className="space-y-3">
            {model.rows.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-stone-200 bg-stone-50 p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-stone-900">{row.title}</p>
                    {row.subtitle ? (
                      <p className="text-sm text-stone-600">{row.subtitle}</p>
                    ) : null}
                    {row.meta ? (
                      <p className="text-xs uppercase tracking-wide text-stone-500">{row.meta}</p>
                    ) : null}
                  </div>

                  {row.action ? (
                    <Link
                      href={row.action.href}
                      className={
                        row.action.tone === "primary"
                          ? "inline-flex items-center justify-center rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
                          : "inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-50"
                      }
                    >
                      {row.action.label}
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}