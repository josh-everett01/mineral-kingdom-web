import type { ReactNode } from "react"
import { requireAuth } from "@/lib/auth/guards"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireAuth("/dashboard")

  return <>{children}</>
}