"use client"

import { useEffect, useRef } from "react"

type Props = {
  cartId: string
  onSnapshot?: () => void
}

export function CartRealtimeClient({ cartId, onSnapshot }: Props) {
  const hasSeenInitialSnapshotRef = useRef(false)
  const refreshTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!cartId) return

    hasSeenInitialSnapshotRef.current = false

    const eventSource = new EventSource(`/api/bff/sse/cart/${cartId}`)

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current !== null) {
        return
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null
        onSnapshot?.()
      }, 500)
    }

    const handleSnapshot = () => {
      // Ignore the initial snapshot that arrives immediately after connect.
      // It represents the current state, not a meaningful change.
      if (!hasSeenInitialSnapshotRef.current) {
        hasSeenInitialSnapshotRef.current = true
        return
      }

      scheduleRefresh()
    }

    eventSource.addEventListener("snapshot", handleSnapshot)

    eventSource.onerror = () => {
      // Browser EventSource automatically retries.
    }

    return () => {
      eventSource.removeEventListener("snapshot", handleSnapshot)

      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }

      eventSource.close()
    }
  }, [cartId, onSnapshot])

  return null
}