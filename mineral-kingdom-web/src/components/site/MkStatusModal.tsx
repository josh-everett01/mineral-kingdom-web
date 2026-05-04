import type { ReactNode } from "react"

type MkStatusModalProps = {
  eyebrow: string
  title: string
  description?: string
  children?: ReactNode
  testId?: string
}

export function MkStatusModal({
  eyebrow,
  title,
  description,
  children,
  testId,
}: MkStatusModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
      data-testid={testId}
    >
      <section className="mk-glass-strong w-full max-w-md rounded-[2rem] p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
          {eyebrow}
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
          {title}
        </h2>

        {description ? (
          <p className="mt-2 text-sm leading-6 mk-muted-text">{description}</p>
        ) : null}

        {children ? <div className="mt-5">{children}</div> : null}
      </section>
    </div>
  )
}