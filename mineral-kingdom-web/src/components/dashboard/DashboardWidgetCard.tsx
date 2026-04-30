import Link from "next/link"
import type { DashboardWidgetModel } from "@/lib/dashboard/types"

type Props = {
  testId: string
  model: DashboardWidgetModel
}

export function DashboardWidgetCard({ testId, model }: Props) {
  return (
    <section className="mk-glass-strong h-full rounded-[2rem] p-5" data-testid={testId}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[color:var(--mk-ink)]">
              {model.title}
            </h3>
            <p className="text-sm leading-6 mk-muted-text">{model.description}</p>
          </div>

          <div className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-3 py-2 text-right">
            <div className="text-2xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
              {model.countValue}
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
              {model.countLabel}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        {model.rows.length === 0 ? (
          <p className="text-sm mk-muted-text">{model.emptyMessage}</p>
        ) : (
          <ul className="space-y-3">
            {model.rows.map((row) => (
              <li
                key={row.id}
                className="rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-semibold text-[color:var(--mk-ink)]">
                      {row.title}
                    </p>
                    {row.subtitle ? (
                      <p className="text-sm mk-muted-text">{row.subtitle}</p>
                    ) : null}
                    {row.meta ? (
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mk-gold)]">
                        {row.meta}
                      </p>
                    ) : null}
                  </div>

                  {row.action ? (
                    <Link
                      href={row.action.href}
                      className={
                        row.action.tone === "primary"
                          ? "mk-cta inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold"
                          : "inline-flex items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
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
      </div>
    </section>
  )
}