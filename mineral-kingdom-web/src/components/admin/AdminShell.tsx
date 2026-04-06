import type { ReactNode } from "react"
import type { AppSession } from "@/lib/auth/session"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminTopbar } from "@/components/admin/AdminTopbar"

function getHighestAdminRole(roles: readonly string[]) {
  if (roles.includes("OWNER")) {
    return "OWNER"
  }

  if (roles.includes("STAFF")) {
    return "STAFF"
  }

  return roles[0] ?? "UNKNOWN"
}

type AdminShellProps = {
  session: AppSession
  environmentLabel: string
  children: ReactNode
}

export function AdminShell({ session, environmentLabel, children }: AdminShellProps) {
  const roleLabel = getHighestAdminRole(session.roles)

  return (
    <div data-testid="admin-shell" className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <AdminSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar
            environmentLabel={environmentLabel}
            roleLabel={roleLabel}
            email={session.user?.email ?? null}
          />

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  )
}