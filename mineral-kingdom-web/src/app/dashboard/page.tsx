import { ProtectedPage } from "@/components/auth/ProtectedPage"
import { DashboardClient } from "@/components/dashboard/DashboardClient"

export default function DashboardPage() {
  return (
    <main className="mk-preview-page min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <ProtectedPage>
          <DashboardClient />
        </ProtectedPage>
      </div>
    </main>
  )
}