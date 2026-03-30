import Link from "next/link"

type PaymentStatusTone = "neutral" | "info" | "success" | "error"

type PaymentStatusPanelProps = {
  title: string
  body: string
  tone?: PaymentStatusTone
  actions?: Array<{
    label: string
    href: string
    variant?: "primary" | "secondary"
  }>
  testId?: string
}

function toneClasses(tone: PaymentStatusTone) {
  switch (tone) {
    case "info":
      return "border-blue-200 bg-blue-50 text-blue-950"
    case "success":
      return "border-green-200 bg-green-50 text-green-950"
    case "error":
      return "border-red-200 bg-red-50 text-red-950"
    default:
      return "border-stone-200 bg-stone-50 text-stone-900"
  }
}

function primaryLinkClasses(tone: PaymentStatusTone) {
  switch (tone) {
    case "info":
      return "bg-blue-900 text-white hover:bg-blue-800"
    case "success":
      return "bg-green-900 text-white hover:bg-green-800"
    case "error":
      return "bg-red-900 text-white hover:bg-red-800"
    default:
      return "bg-stone-900 text-white hover:bg-stone-800"
  }
}

export function PaymentStatusPanel({
  title,
  body,
  tone = "neutral",
  actions = [],
  testId,
}: PaymentStatusPanelProps) {
  const panelToneClasses = toneClasses(tone)
  const primaryClasses = primaryLinkClasses(tone)

  return (
    <section
      className={`rounded-2xl border p-4 shadow-sm ${panelToneClasses}`}
      data-testid={testId}
    >
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 opacity-90">{body}</p>

      {actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {actions.map((action) => (
            <Link
              key={`${action.label}-${action.href}`}
              href={action.href}
              className={
                action.variant === "secondary"
                  ? "inline-flex rounded-full border border-current bg-white px-4 py-2 text-sm font-medium transition hover:bg-black/5"
                  : `inline-flex rounded-full px-4 py-2 text-sm font-medium transition ${primaryClasses}`
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  )
}