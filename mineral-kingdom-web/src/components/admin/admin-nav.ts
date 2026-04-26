export type AdminNavItem = {
  label: string
  href: string
  matchMode?: "exact" | "startsWith"
  testId: string
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", matchMode: "exact", testId: "admin-nav-link-dashboard" },
  {
    href: "/admin/minerals",
    label: "Minerals",
    testId: "admin-nav-link-minerals",
  },
  { label: "Listings", href: "/admin/listings", matchMode: "startsWith", testId: "admin-nav-link-listings" },
  {
    label: "Store Offers",
    href: "/admin/store/offers",
    matchMode: "startsWith",
    testId: "admin-nav-link-store-offers",
  },
  { label: "Auctions", href: "/admin/auctions", matchMode: "startsWith", testId: "admin-nav-link-auctions" },
  { label: "Orders / Refunds", href: "/admin/orders", matchMode: "startsWith", testId: "admin-nav-link-orders" },
  {
    label: "Fulfillment",
    href: "/admin/fulfillment",
    matchMode: "startsWith",
    testId: "admin-nav-link-fulfillment",
  },
  { label: "Support", href: "/admin/support", matchMode: "startsWith", testId: "admin-nav-link-support" },
  { label: "CMS", href: "/admin/cms", matchMode: "startsWith", testId: "admin-nav-link-cms" },
  {
    label: "Analytics",
    href: "/admin/analytics",
    matchMode: "startsWith",
    testId: "admin-nav-link-analytics",
  },
  { label: "System", href: "/admin/system", matchMode: "startsWith", testId: "admin-nav-link-system" },
  { label: "Users", href: "/admin/users", matchMode: "startsWith", testId: "admin-nav-link-users" },
]