import Link from "next/link"
import { ArrowRight, LayoutDashboard } from "lucide-react"

import { ADMIN_NAV_ITEMS } from "@/components/admin/admin-nav"

const CARD_DESCRIPTIONS: Record<string, string> = {
  Minerals: "Manage the mineral database — species, taxonomy, classifications, and specimen metadata.",
  Listings:
    "Create and manage product listings. Set prices, update availability, attach media, and publish to the store.",
  "Store Offers":
    "Configure pricing, discounts, and promotional offers tied to active store listings.",
  Auctions:
    "Set up timed auctions, monitor live bidding activity, and close or manage auction events.",
  "Orders / Refunds":
    "View and manage customer orders, process refunds, and track order status through fulfillment.",
  Fulfillment:
    "Manage packing queues, shipping labels, and delivery workflows for outbound orders.",
  Support:
    "Review and respond to customer support tickets, escalations, and account inquiries.",
  CMS: "Edit public-facing pages — About, FAQ, Privacy Policy, Terms & Conditions, and more.",
  Analytics:
    "View sales reports, revenue data, traffic metrics, and platform performance over time.",
  System:
    "Monitor system health, background job status, and platform configuration settings.",
  Users: "View and manage customer accounts, assign roles, and control access permissions.",
}

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <section className="mk-glass-strong rounded-[2rem] p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <section className="rounded-[2rem] border border-[color:var(--mk-gold)]/35 bg-[color:var(--mk-panel-muted)] p-5 shadow-sm">
            <p className="text-sm font-semibold text-[color:var(--mk-ink)]">
              Operational changes can affect live buyer experiences.
            </p>
            <p className="mt-2 max-w-4xl text-sm leading-6 mk-muted-text">
              Review catalog status, offer pricing, auction timing, order state, and fulfillment actions
              carefully before saving. Some workflows, like live auctions and confirmed payments, are
              intentionally locked or webhook-driven to protect buyer trust and auditability.
            </p>
          </section>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[color:var(--mk-border)] bg-[color:var(--mk-panel-muted)] text-[color:var(--mk-gold)]">
            <LayoutDashboard className="h-5 w-5" />
          </span>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--mk-gold)]">
              Admin console
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--mk-ink)]">
              Admin dashboard
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 mk-muted-text">
              Manage catalog content, pricing, auctions, orders, fulfillment, customer support,
              CMS content, reporting, system health, and user administration.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ADMIN_NAV_ITEMS.filter((item) => item.href !== "/admin").map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="mk-glass group flex h-full flex-col rounded-[2rem] p-5 transition hover:-translate-y-0.5"
            data-testid={`admin-dashboard-link-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          >
            <div className="flex flex-1 flex-col">
              <h2 className="text-lg font-semibold text-[color:var(--mk-ink)]">
                {item.label}
              </h2>

              <p className="mt-2 text-sm leading-6 mk-muted-text">
                {CARD_DESCRIPTIONS[item.label] ??
                  `Manage ${item.label.toLowerCase()} settings and workflows.`}
              </p>
            </div>

            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--mk-gold)]">
              Open {item.label}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}