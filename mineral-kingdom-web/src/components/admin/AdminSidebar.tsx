import { Gem, ShieldCheck } from "lucide-react"
import { AdminNav } from "@/components/admin/AdminNav"

export function AdminSidebar() {
  return (
    <aside
      data-testid="admin-sidebar"
      className="hidden w-76 shrink-0 border-r border-[color:var(--mk-border)] bg-[rgb(var(--mk-page-rgb)/0.72)] px-4 py-6 backdrop-blur-xl lg:block"
    >
      <div className="sticky top-6 space-y-5">
        <div className="mk-glass-strong rounded-[2rem] p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[color:var(--mk-border-strong)] bg-[color:var(--mk-panel)] text-[color:var(--mk-gold)]">
              <Gem className="h-5 w-5" />
            </span>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
                Mineral Kingdom
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-[color:var(--mk-ink)]">
                Admin Console
              </h2>
              <p className="mt-1 text-xs leading-5 mk-muted-text">
                Operational tools for catalog, auctions, orders, fulfillment, support, and content.
              </p>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] px-3 py-2 text-xs font-semibold text-[color:var(--mk-ink)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--mk-gold)]" />
            Staff + Owner access
          </div>
        </div>

        <AdminNav />
      </div>
    </aside>
  )
}