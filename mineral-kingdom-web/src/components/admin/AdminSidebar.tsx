import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AdminNav } from "@/components/admin/AdminNav"

export function AdminSidebar() {
  return (
    <aside
      data-testid="admin-sidebar"
      className="hidden w-72 shrink-0 border-r bg-muted/30 px-4 py-6 lg:block"
    >
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Mineral Kingdom
          </p>
          <h2 className="mt-1 text-lg font-semibold">Admin Console</h2>
        </div>

        <Badge variant="secondary">Staff + Owner</Badge>

        <Separator />

        <AdminNav />
      </div>
    </aside>
  )
}