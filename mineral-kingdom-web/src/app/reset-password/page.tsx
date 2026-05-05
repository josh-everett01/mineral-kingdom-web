import * as React from "react"
import PasswordResetConfirmClient from "@/app/password-reset/confirm/PasswordResetConfirmationClient"

export const metadata = { title: "Reset Password" }

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <PasswordResetConfirmClient />
    </React.Suspense>
  )
}