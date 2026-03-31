import { expect, test, type Page } from "@playwright/test"

const GROUP_ID = "f1111111-2222-3333-4444-555555555555"
const FULFILLMENT_URL = `/fulfillment/${GROUP_ID}`

function buildAuthenticatedMe() {
  return {
    isAuthenticated: true,
    emailVerified: true,
    user: {
      id: "41c039fe-1257-4e29-9ad7-f8cd09a2f261",
      email: "fulfillment@example.com",
    },
    roles: ["USER"],
    accessTokenExpiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 60 * 10,
  }
}

function buildPackedSnapshot() {
  return {
    FulfillmentGroupId: GROUP_ID,
    Status: "PACKED",
    Carrier: null,
    TrackingNumber: null,
    TrackingUrl: null,
    PackedAt: "2026-04-03T16:00:00.000000+00:00",
    ShippedAt: null,
    DeliveredAt: null,
    UpdatedAt: "2026-04-03T16:00:00.000000+00:00",
  }
}

function buildShippedSnapshot() {
  return {
    FulfillmentGroupId: GROUP_ID,
    Status: "SHIPPED",
    Carrier: "UPS",
    TrackingNumber: "1Z999AA10123456784",
    TrackingUrl: "https://tracking.example.com/1Z999AA10123456784",
    PackedAt: "2026-04-03T16:00:00.000000+00:00",
    ShippedAt: "2026-04-04T10:30:00.000000+00:00",
    DeliveredAt: null,
    UpdatedAt: "2026-04-04T10:30:00.000000+00:00",
  }
}

function buildDeliveredSnapshot() {
  return {
    FulfillmentGroupId: GROUP_ID,
    Status: "DELIVERED",
    Carrier: "UPS",
    TrackingNumber: "1Z999AA10123456784",
    TrackingUrl: "https://tracking.example.com/1Z999AA10123456784",
    PackedAt: "2026-04-03T16:00:00.000000+00:00",
    ShippedAt: "2026-04-04T10:30:00.000000+00:00",
    DeliveredAt: "2026-04-05T15:45:00.000000+00:00",
    UpdatedAt: "2026-04-05T15:45:00.000000+00:00",
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

async function mockFulfillmentSse(page: Page, snapshot: Record<string, unknown>) {
  await page.route(`**/api/bff/sse/fulfillment-groups/${GROUP_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
      body: `event: snapshot
data: ${JSON.stringify(snapshot)}

`,
    })
  })
}

test.describe("fulfillment tracking", () => {
  test("initial state renders sensible packed status with partial shipment info", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockFulfillmentSse(page, buildPackedSnapshot())

    await page.goto(FULFILLMENT_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("fulfillment-page")).toBeVisible()
    await expect(page.getByTestId("fulfillment-status")).toContainText("PACKED")
    await expect(page.getByTestId("fulfillment-status-card")).toContainText(/packed/i)

    await expect(page.getByTestId("fulfillment-timeline")).toBeVisible()
    await expect(page.getByTestId("fulfillment-timeline")).toContainText("Packed")
    await expect(page.getByTestId("fulfillment-timeline")).toContainText("Shipped")
    await expect(page.getByTestId("fulfillment-timeline")).toContainText("Delivered")

    await expect(page.getByTestId("fulfillment-carrier")).toContainText("Not assigned yet")
    await expect(page.getByTestId("fulfillment-tracking-number")).toContainText(
      "Not available yet",
    )
    await expect(page.getByTestId("fulfillment-no-tracking-link")).toBeVisible()
  })

  test("shipped state shows carrier and tracking details", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockFulfillmentSse(page, buildShippedSnapshot())

    await page.goto(FULFILLMENT_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("fulfillment-page")).toBeVisible()
    await expect(page.getByTestId("fulfillment-status")).toContainText("SHIPPED")
    await expect(page.getByTestId("fulfillment-carrier")).toContainText("UPS")
    await expect(page.getByTestId("fulfillment-tracking-number")).toContainText(
      "1Z999AA10123456784",
    )
    await expect(page.getByTestId("fulfillment-tracking-link")).toHaveAttribute(
      "href",
      "https://tracking.example.com/1Z999AA10123456784",
    )
  })

  test("delivered state renders clearly", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockFulfillmentSse(page, buildDeliveredSnapshot())

    await page.goto(FULFILLMENT_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("fulfillment-page")).toBeVisible()
    await expect(page.getByTestId("fulfillment-status")).toContainText("DELIVERED")
    await expect(page.getByTestId("fulfillment-status-card")).toContainText(/delivered/i)

    const steps = page.getByTestId("fulfillment-timeline-step")
    await expect(steps).toHaveCount(3)
    await expect(page.getByTestId("fulfillment-timeline")).toContainText("Delivered")
  })

  test("sse update path moves page from packed to shipped without refresh", async ({ page }) => {
    await mockAuthenticatedSession(page)

    await page.route(`**/api/bff/sse/fulfillment-groups/${GROUP_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
        },
        body: `event: snapshot
data: ${JSON.stringify(buildPackedSnapshot())}

event: snapshot
data: ${JSON.stringify(buildShippedSnapshot())}

`,
      })
    })

    await page.goto(FULFILLMENT_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("fulfillment-status")).toContainText("SHIPPED")
    await expect(page.getByTestId("fulfillment-carrier")).toContainText("UPS")
    await expect(page.getByTestId("fulfillment-tracking-number")).toContainText(
      "1Z999AA10123456784",
    )
    await expect(page.getByTestId("fulfillment-tracking-link")).toHaveAttribute(
      "href",
      "https://tracking.example.com/1Z999AA10123456784",
    )
  })

  test("page remains useful if live updates disconnect after state is shown", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockFulfillmentSse(page, buildShippedSnapshot())

    await page.goto(FULFILLMENT_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("fulfillment-status")).toContainText("SHIPPED")
    await expect(page.getByTestId("fulfillment-carrier")).toContainText("UPS")

    await page.unroute(`**/api/bff/sse/fulfillment-groups/${GROUP_ID}`)
    await page.route(`**/api/bff/sse/fulfillment-groups/${GROUP_ID}`, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          status: 503,
          code: "SSE_UNAVAILABLE",
          message: "Live updates unavailable.",
        }),
      })
    })

    await page.reload({ waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("fulfillment-page")).toBeVisible()
    await expect(page.getByTestId("fulfillment-live-status")).toContainText(/live updates/i)
  })
})