import type { ReactNode } from "react"
import { requireRole } from "@/lib/auth/guards"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole(["STAFF", "OWNER"], "/admin")

  return <>{children}</>
}