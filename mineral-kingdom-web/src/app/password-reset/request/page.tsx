import * as React from "react"
import PasswordResetRequestClient from "./PasswordResetRequestClient"

export default function PasswordResetRequestPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <PasswordResetRequestClient />
    </React.Suspense>
  )
}