"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

type Props = {
  cartId: string
}

export function CartRealtimeClient({ cartId }: Props) {
  const router = useRouter()
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
        router.refresh()
      }, 500)
    }

    const handleSnapshot = () => {
      scheduleRefresh()
    }

    eventSource.addEventListener("snapshot", handleSnapshot)

    eventSource.onerror = () => {
      // Browser EventSource will retry automatically.
    }

    return () => {
      eventSource.removeEventListener("snapshot", handleSnapshot)

      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }

      eventSource.close()
    }
  }, [cartId, router])

  return null
}