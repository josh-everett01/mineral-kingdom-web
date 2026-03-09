import * as React from "react"
import PasswordResetConfirmClient from './PasswordResetConfirmationClient'

export default function PasswordResetConfirmPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <PasswordResetConfirmClient />
    </React.Suspense>
  )
}