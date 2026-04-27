import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">Admin dashboard</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Use the admin console to manage catalog content, pricing, auctions, orders, fulfillment,
          customer support, CMS content, reporting, system health, and user administration.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ADMIN_NAV_ITEMS.filter((item) => item.href !== "/admin").map((item) => (
          <Card key={item.href}>
            <CardHeader>
              <CardTitle className="text-lg">{item.label}</CardTitle>
              <CardDescription>
                {CARD_DESCRIPTIONS[item.label] ?? `Manage ${item.label.toLowerCase()} settings and workflows.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={item.href}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                data-testid={`admin-dashboard-link-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                Open {item.label}
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}