import * as React from "react"
import VerifyEmailClient from "./VerifyEmailClient"

export default function VerifyEmailPage() {
  return (
    <React.Suspense
      fallback={
        <main className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <section className="mk-glass-strong mx-auto max-w-md rounded-[2rem] p-6">
            <p className="text-sm mk-muted-text">Loading…</p>
          </section>
        </main>
      }
    >
      <VerifyEmailClient />
    </React.Suspense>
  )
}