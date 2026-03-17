"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import type { CartNoticeDto } from "@/lib/cart/cartTypes"

type Props = {
  notices: CartNoticeDto[]
}

const STORAGE_KEY = "mk_seen_cart_notice_ids"

function getSeenIds(): string[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setSeenIds(ids: string[]) {
  if (typeof window === "undefined") return

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

export function CartNoticesToastClient({ notices }: Props) {
  useEffect(() => {
    if (!notices.length) return

    const seen = new Set(getSeenIds())
    const newSeen = new Set(seen)

    for (const notice of notices) {
      if (seen.has(notice.id)) continue

      toast.info(notice.message, {
        id: `cart-notice-${notice.id}`,
      })

      newSeen.add(notice.id)
    }

    setSeenIds([...newSeen])
  }, [notices])

  return null
}