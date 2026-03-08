import * as React from "react"
import VerifyEmailClient from './VerifyEmailClient'

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <VerifyEmailClient />
    </React.Suspense>
  )
}