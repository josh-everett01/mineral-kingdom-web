"use client"

import { useEffect, useRef } from "react"

type Props = {
  cartId: string
  onSnapshot?: () => void
}

export function CartRealtimeClient({ cartId, onSnapshot }: Props) {
  const refreshTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!cartId) return

    const eventSource = new EventSource(`/api/bff/sse/cart/${cartId}`)

    // The backend immediately publishes the current cart state as the first
    // "snapshot" event when a client connects (CartEventsController). Skip
    // this initial echo — the cart was just fetched, so triggering a
    // background reload is redundant and causes a visible "Refreshing…"
    // flicker on every page visit. Subsequent snapshots are genuine mutations
    // and should still trigger a refresh.
    let isFirstSnapshot = true

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current !== null) {
        return
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null
        onSnapshot?.()
      }, 300)
    }

    const handleSnapshot = () => {
      if (isFirstSnapshot) {
        isFirstSnapshot = false
        return
      }
      // In the client-owned cart architecture, every snapshot after the
      // initial echo is useful and should trigger a background refresh.
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