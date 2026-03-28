import { expect, test, type Page } from "@playwright/test"

const DASHBOARD_URL = "/dashboard"

function buildAuthenticatedMe() {
  return {
    isAuthenticated: true,
    emailVerified: true,
    user: {
      id: "41c039fe-1257-4e29-9ad7-f8cd09a2f261",
      email: "one@two.com",
    },
    roles: ["USER"],
    accessTokenExpiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 60 * 10,
  }
}

function buildUnauthenticatedMe() {
  return {
    isAuthenticated: false,
    user: null,
    roles: [],
    accessTokenExpiresAtEpochSeconds: null,
    code: "AUTH_EXPIRED",
    message: "Your session expired. Please sign in again.",
  }
}

function buildDashboardFixture() {
  return {
    wonAuctions: [
      {
        auctionId: "a7e13d24-c538-4e66-9437-e55e6ef78d08",
        listingId: "05dee38f-6f8e-402e-bc39-9ef63df92956",
        currentPriceCents: 10500,
        closeTime: "2026-03-25T21:41:19.828377+00:00",
        status: "CLOSED_PAID",
      },
    ],
    unpaidAuctionOrders: [
      {
        orderId: "20548e00-7b1a-4c4b-9ad1-1a5b8f5561d3",
        orderNumber: "MK-20260326-C10CA1",
        sourceType: "AUCTION",
        status: "AWAITING_PAYMENT",
        totalCents: 11000,
        currencyCode: "USD",
        createdAt: "2026-03-26T12:10:18.795374+00:00",
        paymentDueAt: "2026-03-28T12:10:18.795374+00:00",
        fulfillmentGroupId: null,
      },
    ],
    paidOrders: [
      {
        orderId: "e3995a99-eab9-47c9-898a-088f2d7d0df1",
        orderNumber: "MK-20260325-D013EC",
        sourceType: "AUCTION",
        status: "READY_TO_FULFILL",
        totalCents: 10500,
        currencyCode: "USD",
        createdAt: "2026-03-25T21:51:59.27348+00:00",
        paymentDueAt: "2026-03-27T21:51:59.27348+00:00",
        fulfillmentGroupId: null,
      },
      {
        orderId: "a25edef3-8d70-488b-98d3-3b591ab95cb9",
        orderNumber: "MK-20260325-2CCFD2",
        sourceType: "STORE",
        status: "READY_TO_FULFILL",
        totalCents: 16000,
        currencyCode: "USD",
        createdAt: "2026-03-25T21:23:22.227736+00:00",
        paymentDueAt: null,
        fulfillmentGroupId: null,
      },
    ],
    openBox: {
      fulfillmentGroupId: "7d3c61b8-b3bb-4db0-961c-522d0d00d111",
      status: "PACKING",
      updatedAt: "2026-03-27T16:30:00.000000+00:00",
      orders: [
        {
          orderId: "e3995a99-eab9-47c9-898a-088f2d7d0df1",
          orderNumber: "MK-20260325-D013EC",
          sourceType: "AUCTION",
          status: "READY_TO_FULFILL",
          totalCents: 10500,
          currencyCode: "USD",
          createdAt: "2026-03-25T21:51:59.27348+00:00",
          paymentDueAt: "2026-03-27T21:51:59.27348+00:00",
          fulfillmentGroupId: "7d3c61b8-b3bb-4db0-961c-522d0d00d111",
        },
      ],
    },
    shippingInvoices: [
      {
        shippingInvoiceId: "77fe1dbf-2d9b-4a38-8224-6d8f276a9c9b",
        fulfillmentGroupId: "7d3c61b8-b3bb-4db0-961c-522d0d00d111",
        amountCents: 2800,
        currencyCode: "USD",
        status: "UNPAID",
        provider: null,
        providerCheckoutId: null,
        paidAt: null,
        createdAt: "2026-03-27T16:35:00.000000+00:00",
      },
    ],
  }
}

function buildEmptyDashboardFixture() {
  return {
    wonAuctions: [],
    unpaidAuctionOrders: [],
    paidOrders: [],
    openBox: null,
    shippingInvoices: [],
  }
}

async function mockAuthenticatedSession(page: Page) {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildAuthenticatedMe()),
    })
  })
}

async function mockUnauthenticatedSession(page: Page) {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify(buildUnauthenticatedMe()),
    })
  })
}

async function mockDashboard(page: Page, body: unknown, status = 200) {
  await page.route("**/api/bff/me/dashboard", async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  })
}

async function gotoDashboard(page: Page) {
  await page.goto(DASHBOARD_URL, { waitUntil: "domcontentloaded" })
}

test.describe("dashboard", () => {
  test("authenticated happy path renders widgets and action CTAs", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockDashboard(page, buildDashboardFixture())

    await gotoDashboard(page)

    await expect(page.getByTestId("dashboard-page")).toBeVisible()

    await expect(page.getByTestId("dashboard-widget-auctions")).toBeVisible()
    await expect(page.getByTestId("dashboard-widget-orders")).toBeVisible()
    await expect(page.getByTestId("dashboard-widget-shipping-invoices")).toBeVisible()
    await expect(page.getByTestId("dashboard-widget-fulfillment")).toBeVisible()

    await expect(page.getByText(/pay order mk-20260326-c10ca1/i)).toBeVisible()
    await expect(page.getByText(/view order mk-20260325-d013ec/i)).toBeVisible()
    await expect(page.getByText(/contact support about shipping invoice/i)).toBeVisible()

    await expect(page.getByText(/auction order mk-20260326-c10ca1/i)).toBeVisible()

    await expect(
      page.getByTestId("dashboard-widget-orders").getByText(/mk-20260325-d013ec/i),
    ).toBeVisible()

    await expect(
      page.getByTestId("dashboard-widget-fulfillment").getByText(/mk-20260325-d013ec/i),
    ).toBeVisible()

    await expect(
      page.getByTestId("dashboard-widget-shipping-invoices").getByText(/^shipping invoice$/i),
    ).toBeVisible()

    await expect(page.getByText(/packing/i)).toBeVisible()

    await expect(
      page.getByRole("link", { name: /pay order mk-20260326-c10ca1/i }),
    ).toHaveAttribute("href", "/orders/20548e00-7b1a-4c4b-9ad1-1a5b8f5561d3")
  })

  test("empty state renders for authenticated member with no dashboard data", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockDashboard(page, buildEmptyDashboardFixture())

    await gotoDashboard(page)

    await expect(page.getByTestId("dashboard-page")).toBeVisible()

    await expect(page.getByTestId("dashboard-widget-auctions")).toBeVisible()
    await expect(page.getByTestId("dashboard-widget-orders")).toBeVisible()
    await expect(page.getByTestId("dashboard-widget-shipping-invoices")).toBeVisible()
    await expect(page.getByTestId("dashboard-widget-fulfillment")).toBeVisible()

    await expect(
      page.getByText(/you do not have any active wins or auction payment actions right now/i),
    ).toBeVisible()
    await expect(
      page.getByText(/you do not have any paid orders to review right now/i),
    ).toBeVisible()
    await expect(
      page.getByText(/you do not have any shipping invoices right now/i),
    ).toBeVisible()
    await expect(
      page.getByText(/you do not have any fulfillment updates yet/i),
    ).toBeVisible()
  })

  test("unauthenticated member is redirected or blocked from dashboard", async ({ page }) => {
    await mockUnauthenticatedSession(page)

    await gotoDashboard(page)

    await expect(page).toHaveURL(/\/login(\?|$)/)
  })

  test("dashboard shows error state when dashboard fetch fails for authenticated user", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockDashboard(
      page,
      {
        status: 503,
        code: "UPSTREAM_UNAVAILABLE",
        message: "Dashboard service unavailable",
      },
      503,
    )

    await gotoDashboard(page)

    await expect(page.getByTestId("dashboard-error")).toBeVisible()
    await expect(page.getByText(/we couldn’t load your dashboard/i)).toBeVisible()
    await expect(page.getByText(/dashboard service unavailable/i)).toBeVisible()
  })
})