"use client"

import { useEffect, useMemo, useRef, useState } from "react"

export type AuctionRealtimeSnapshot = {
  auctionId: string
  currentPriceCents: number
  bidCount: number
  reserveMet?: boolean | null
  status?: string
  closingWindowEnd?: string | null
  minimumNextBidCents: number
}

type UseAuctionRealtimeResult = {
  connected: boolean
  connecting: boolean
  lastEventAt: number | null
  latestSnapshot: AuctionRealtimeSnapshot | null
}

export function useAuctionRealtime(
  auctionId: string | null,
): UseAuctionRealtimeResult {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [lastEventAt, setLastEventAt] = useState<number | null>(null)
  const [latestSnapshot, setLatestSnapshot] = useState<AuctionRealtimeSnapshot | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)

  const sseUrl = useMemo(() => {
    if (!auctionId) return null
    return `/api/bff/sse/auctions/${encodeURIComponent(auctionId)}`
  }, [auctionId])

  useEffect(() => {
    if (!sseUrl) return

    setConnecting(true)
    setConnected(false)

    const es = new EventSource(sseUrl)
    eventSourceRef.current = es

    const handleSnapshot = (raw: string) => {
      try {
        const snapshot = JSON.parse(raw) as AuctionRealtimeSnapshot
        setLatestSnapshot(snapshot)
        setLastEventAt(Date.now())
        setConnected(true)
        setConnecting(false)
      } catch {
        // ignore malformed payloads
      }
    }

    es.onopen = () => {
      setConnected(true)
      setConnecting(false)
    }

    es.onmessage = (event) => {
      handleSnapshot(event.data)
    }

    es.addEventListener("snapshot", (event) => {
      const messageEvent = event as MessageEvent
      handleSnapshot(messageEvent.data)
    })

    es.onerror = () => {
      setConnected(false)
      setConnecting(false)
    }

    return () => {
      es.close()
      eventSourceRef.current = null
      setConnected(false)
      setConnecting(false)
    }
  }, [sseUrl])

  return {
    connected,
    connecting,
    lastEventAt,
    latestSnapshot,
  }
}