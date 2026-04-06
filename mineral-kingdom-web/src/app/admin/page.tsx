import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ADMIN_NAV_ITEMS } from "@/components/admin/admin-nav"

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
                {item.label === "Store Offers"
                  ? "Pricing and discount controls land in S16-4."
                  : `${item.label} workflows continue in upcoming S16 stories.`}
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