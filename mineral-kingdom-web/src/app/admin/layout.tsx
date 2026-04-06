import type { ReactNode } from "react"
import { AdminShell } from "@/components/admin/AdminShell"
import { requireRole } from "@/lib/auth/guards"
import { getEnvironmentLabel } from "@/lib/env/display"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireRole(["STAFF", "OWNER"], "/admin")

  return (
    <AdminShell session={session} environmentLabel={getEnvironmentLabel()}>
      {children}
    </AdminShell>
  )
}