import { expect, test, type Page } from "@playwright/test"

const OPEN_BOX_URL = "/open-box"

function buildAuthenticatedMe() {
  return {
    isAuthenticated: true,
    emailVerified: true,
    user: {
      id: "41c039fe-1257-4e29-9ad7-f8cd09a2f261",
      email: "openbox@example.com",
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

function buildOpenGroup() {
  return {
    fulfillmentGroupId: "f1111111-2222-3333-4444-555555555555",
    boxStatus: "OPEN",
    fulfillmentStatus: "READY_TO_FULFILL",
    closedAt: null,
    orderCount: 1,
    orders: [
      {
        orderId: "o1111111-2222-3333-4444-555555555555",
        orderNumber: "MK-20260402-OPEN01",
        totalCents: 11000,
        currencyCode: "USD",
        status: "READY_TO_FULFILL",
      },
    ],
  }
}

function buildClosedGroup() {
  return {
    fulfillmentGroupId: "f1111111-2222-3333-4444-555555555555",
    boxStatus: "CLOSED",
    fulfillmentStatus: "READY_TO_FULFILL",
    closedAt: "2026-04-02T15:00:00.000000+00:00",
    orderCount: 2,
    orders: [
      {
        orderId: "o1111111-2222-3333-4444-555555555555",
        orderNumber: "MK-20260402-CLOSED01",
        totalCents: 11000,
        currencyCode: "USD",
        status: "READY_TO_FULFILL",
      },
      {
        orderId: "o2222222-3333-4444-5555-666666666666",
        orderNumber: "MK-20260402-CLOSED02",
        totalCents: 7600,
        currencyCode: "USD",
        status: "READY_TO_FULFILL",
      },
    ],
  }
}

function buildShippedGroup() {
  return {
    fulfillmentGroupId: "f1111111-2222-3333-4444-555555555555",
    boxStatus: "SHIPPED",
    fulfillmentStatus: "SHIPPED",
    closedAt: "2026-04-01T12:00:00.000000+00:00",
    orderCount: 1,
    orders: [
      {
        orderId: "o3333333-4444-5555-6666-777777777777",
        orderNumber: "MK-20260402-SHIP01",
        totalCents: 5200,
        currencyCode: "USD",
        status: "READY_TO_FULFILL",
      },
    ],
  }
}

function buildInvoice() {
  return {
    shippingInvoiceId: "1b3a4b9d-6b1f-4d9b-8d54-7b2f1e88aa11",
    fulfillmentGroupId: "f1111111-2222-3333-4444-555555555555",
    amountCents: 4200,
    currencyCode: "USD",
    status: "UNPAID",
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

async function mockOpenBox(page: Page, body: unknown, status = 200) {
  await page.route("**/api/bff/me/open-box", async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  })
}

async function mockOpenBoxInvoice(page: Page, body: unknown, status = 200) {
  await page.route("**/api/bff/me/open-box/shipping-invoice", async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  })
}

test.describe("open box", () => {
  test("open group renders orders and no shipping invoice CTA yet", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockOpenBox(page, buildOpenGroup())
    await mockOpenBoxInvoice(page, { error: "INVOICE_NOT_FOUND" }, 404)

    await page.goto(OPEN_BOX_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("open-box-page")).toBeVisible()
    await expect(page.getByTestId("open-box-status")).toContainText("OPEN")
    await expect(page.getByTestId("open-box-status-card")).toContainText(/active/i)

    await expect(page.getByTestId("open-box-items")).toContainText("MK-20260402-OPEN01")
    await expect(page.getByTestId("open-box-items")).toContainText("READY_TO_FULFILL")
    await expect(page.getByTestId("open-box-items")).toContainText("$110.00")

    await expect(page.getByTestId("open-box-pay-shipping")).toHaveCount(0)
    await expect(page.getByTestId("open-box-no-invoice")).toContainText(
      /shipping will be billed once your open box is closed/i,
    )
  })

  test("closed group with invoice shows pay shipping CTA", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockOpenBox(page, buildClosedGroup())
    await mockOpenBoxInvoice(page, buildInvoice())

    await page.goto(OPEN_BOX_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("open-box-page")).toBeVisible()
    await expect(page.getByTestId("open-box-status")).toContainText("CLOSED")
    await expect(page.getByTestId("open-box-items")).toContainText("MK-20260402-CLOSED01")
    await expect(page.getByTestId("open-box-items")).toContainText("MK-20260402-CLOSED02")
    await expect(page.getByTestId("open-box-order-row")).toHaveCount(2)

    await expect(page.getByTestId("open-box-pay-shipping")).toBeVisible()
    await expect(page.getByTestId("open-box-invoice-section")).toContainText("$42.00")
    await expect(page.getByTestId("open-box-pay-shipping")).toHaveAttribute(
      "href",
      "/shipping-invoices/1b3a4b9d-6b1f-4d9b-8d54-7b2f1e88aa11",
    )
  })

  test("shipped group renders shipped state without pay shipping CTA", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockOpenBox(page, buildShippedGroup())
    await mockOpenBoxInvoice(page, { error: "INVOICE_NOT_FOUND" }, 404)

    await page.goto(OPEN_BOX_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("open-box-page")).toBeVisible()
    await expect(page.getByTestId("open-box-status")).toContainText("SHIPPED")
    await expect(page.getByTestId("open-box-status-card")).toContainText(/has shipped/i)
    await expect(page.getByTestId("open-box-items")).toContainText("MK-20260402-SHIP01")
    await expect(page.getByTestId("open-box-pay-shipping")).toHaveCount(0)
    await expect(page.getByTestId("open-box-no-invoice")).toContainText(
      /shipping payment is no longer needed/i,
    )
  })

  test("empty state renders for member with no open box", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockOpenBox(page, { error: "OPEN_BOX_NOT_FOUND" }, 404)
    await mockOpenBoxInvoice(page, { error: "INVOICE_NOT_FOUND" }, 404)

    await page.goto(OPEN_BOX_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("open-box-empty")).toBeVisible()
    await expect(page.getByTestId("open-box-empty")).toContainText(
      /you do not have an open box yet/i,
    )
    await expect(page.getByTestId("open-box-empty")).toContainText(
      /combine eligible purchases into one shipment/i,
    )
  })

  test("unauthenticated member is prompted to sign in again", async ({ page }) => {
    await mockUnauthenticatedSession(page)
    await mockOpenBox(
      page,
      {
        code: "AUTH_EXPIRED",
        message: "Your session expired. Please sign in again.",
      },
      401,
    )
    await mockOpenBoxInvoice(
      page,
      {
        code: "AUTH_EXPIRED",
        message: "Your session expired. Please sign in again.",
      },
      401,
    )

    await page.goto(OPEN_BOX_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("open-box-error")).toBeVisible()
    await expect(page.getByTestId("open-box-sign-in-again")).toBeVisible()
  })

  test("open group ignores historical paid invoice response and does not show shipping CTA", async ({
    page,
  }) => {
    await mockAuthenticatedSession(page)
    await mockOpenBox(page, buildOpenGroup())
    await mockOpenBoxInvoice(page, {
      shippingInvoiceId: "historical-paid-invoice",
      fulfillmentGroupId: "old-closed-group",
      amountCents: 4200,
      currencyCode: "USD",
      status: "PAID",
    })

    await page.goto(OPEN_BOX_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("open-box-status")).toContainText("OPEN")
    await expect(page.getByTestId("open-box-pay-shipping")).toHaveCount(0)
    await expect(page.getByTestId("open-box-no-invoice")).toContainText(
      /shipping will be billed once your open box is closed/i,
    )
  })

  test("closed group with paid invoice shows view invoice instead of pay shipping", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockOpenBox(page, buildClosedGroup())
    await mockOpenBoxInvoice(page, {
      ...buildInvoice(),
      status: "PAID",
      paidAt: "2026-04-02T16:00:00.000000+00:00",
    })

    await page.goto(OPEN_BOX_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("open-box-status")).toContainText("CLOSED")
    await expect(page.getByTestId("open-box-invoice-section")).toContainText("Status: PAID")
    await expect(page.getByTestId("open-box-pay-shipping")).toContainText(/view invoice/i)
  })
})