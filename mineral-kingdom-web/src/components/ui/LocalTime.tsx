"use client"

import { useEffect, useState } from "react"

const dateFormatOptions: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
}

/**
 * Renders a UTC ISO datetime string in the user's local timezone.
 *
 * Uses useState + useEffect so the server always renders the fallback ("—"),
 * and the browser sets the real local time after hydration. This prevents
 * suppressHydrationWarning from locking in the wrong UTC time on page refresh
 * (Cloudflare Workers runtime has no local timezone, so server render = UTC).
 */
export function LocalTime({
  value,
  fallback = "—",
}: {
  value: string | null | undefined
  fallback?: string
}) {
  const [display, setDisplay] = useState<string>(fallback)

  useEffect(() => {
    if (!value) {
      setDisplay(fallback)
      return
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      setDisplay(fallback)
      return
    }
    setDisplay(new Intl.DateTimeFormat("en-US", dateFormatOptions).format(date))
  }, [value, fallback])

  return <span>{display}</span>
}
