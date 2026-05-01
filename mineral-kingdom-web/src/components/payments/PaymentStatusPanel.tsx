"use client"

import Link from "next/link"

type PaymentStatusPanelTone = "info" | "success" | "warning" | "error"

type PaymentStatusPanelAction = {
  label: string
  href: string
  variant?: "primary" | "secondary"
}

type Props = {
  testId?: string
  tone?: PaymentStatusPanelTone
  title: string
  body: string
  actions?: PaymentStatusPanelAction[]
}

function toneClasses(tone: PaymentStatusPanelTone) {
  switch (tone) {
    case "success":
      return {
        panel:
          "border-emerald-300/50 bg-emerald-500/10 shadow-[0_18px_55px_rgba(16,185,129,0.12)]",
        title: "text-[color:var(--mk-ink)]",
        accent: "bg-emerald-400",
      }
    case "warning":
      return {
        panel:
          "border-amber-300/50 bg-amber-500/10 shadow-[0_18px_55px_rgba(245,158,11,0.12)]",
        title: "text-[color:var(--mk-ink)]",
        accent: "bg-amber-400",
      }
    case "error":
      return {
        panel:
          "border-[color:var(--mk-danger)]/50 bg-[color:var(--mk-panel-muted)] shadow-[0_18px_55px_rgba(239,68,68,0.12)]",
        title: "text-[color:var(--mk-danger)]",
        accent: "bg-[color:var(--mk-danger)]",
      }
    case "info":
    default:
      return {
        panel:
          "border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] shadow-[0_18px_55px_rgba(0,0,0,0.08)]",
        title: "text-[color:var(--mk-ink)]",
        accent: "bg-[color:var(--mk-gold)]",
      }
  }
}

function actionClass(variant: PaymentStatusPanelAction["variant"]) {
  if (variant === "primary") {
    return "mk-cta inline-flex min-h-10 items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold"
  }

  return "inline-flex min-h-10 items-center justify-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel)] px-4 py-2 text-sm font-semibold text-[color:var(--mk-ink)] transition hover:bg-[color:var(--mk-panel-muted)]"
}

export function PaymentStatusPanel({
  testId,
  tone = "info",
  title,
  body,
  actions = [],
}: Props) {
  const classes = toneClasses(tone)

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border p-5 sm:p-6 ${classes.panel}`}
      data-testid={testId}
    >
      <div
        aria-hidden="true"
        className={`absolute left-0 top-6 h-10 w-1 rounded-r-full ${classes.accent}`}
      />

      <div className="pl-2">
        <h2 className={`text-base font-semibold sm:text-lg ${classes.title}`}>
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 mk-muted-text">
          {body}
        </p>

        {actions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-3">
            {actions.map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className={actionClass(action.variant)}
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}