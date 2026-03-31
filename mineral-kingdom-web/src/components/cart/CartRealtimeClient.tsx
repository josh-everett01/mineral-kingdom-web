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
      // In the client-owned cart architecture, every snapshot is useful,
      // including the initial one after connect. We no longer router.refresh(),
      // so there is no full-page refresh loop to guard against here.
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