type PaymentContextRowProps = {
  imageUrl?: string | null
  imageAlt: string
  fallbackLabel: string
  badge?: string | null
  title: string
  context: string
  helper?: string | null
  amount?: string | null
  testId?: string
}

function Thumbnail({
  imageUrl,
  imageAlt,
  fallbackLabel,
  testId,
}: {
  imageUrl?: string | null
  imageAlt: string
  fallbackLabel: string
  testId?: string
}) {
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
      data-testid={testId}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={imageAlt} className="h-full w-full object-cover" />
      ) : (
        <span className="px-2 text-center text-[11px] font-medium text-stone-500">
          {fallbackLabel}
        </span>
      )}
    </div>
  )
}

export function PaymentContextRow({
  imageUrl,
  imageAlt,
  fallbackLabel,
  badge,
  title,
  context,
  helper,
  amount,
  testId,
}: PaymentContextRowProps) {
  return (
    <div
      className="flex items-start gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4"
      data-testid={testId}
    >
      <Thumbnail
        imageUrl={imageUrl}
        imageAlt={imageAlt}
        fallbackLabel={fallbackLabel}
        testId={testId ? `${testId}-thumbnail` : undefined}
      />

      <div className="min-w-0 flex-1">
        {badge ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{badge}</p>
        ) : null}

        <p className="mt-1 truncate text-sm font-semibold text-stone-900">{title}</p>
        <p className="mt-1 text-sm text-stone-600">{context}</p>

        {helper ? <p className="mt-1 text-sm text-stone-700">{helper}</p> : null}
      </div>

      {amount ? (
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Amount due</p>
          <p className="mt-1 text-sm font-semibold text-stone-900">{amount}</p>
        </div>
      ) : null}
    </div>
  )
}