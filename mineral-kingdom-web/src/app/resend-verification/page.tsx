import * as React from "react"
import ResendVerificationClient from './ResendVerificationClient'

export default function ResendVerificationPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <ResendVerificationClient />
    </React.Suspense>
  )
}