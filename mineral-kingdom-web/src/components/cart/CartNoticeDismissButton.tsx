"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type Props = {
  noticeId: string
}

export function CartNoticeDismissButton({ noticeId }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleDismiss() {
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/bff/cart/notices/${noticeId}/dismiss`, {
        method: "POST",
        cache: "no-store",
      })

      if (!res.ok) {
        setIsSubmitting(false)
        return
      }

      router.refresh()
    } catch {
      setIsSubmitting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleDismiss()}
      disabled={isSubmitting}
      className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
      data-testid="cart-notice-dismiss"
    >
      {isSubmitting ? "Dismissing..." : "Dismiss"}
    </button>
  )
}