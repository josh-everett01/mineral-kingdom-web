import { expect, test, type Page } from "@playwright/test"

const ORDER_ID = "20548e00-7b1a-4c4b-9ad1-1a5b8f5561d3"
const ORDER_URL = `/orders/${ORDER_ID}`

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

function buildAwaitingPaymentOrder() {
  return {
    id: ORDER_ID,
    userId: "41c039fe-1257-4e29-9ad7-f8cd09a2f261",
    orderNumber: "MK-20260328-ABC123",
    sourceType: "AUCTION",
    auctionId: "a7e13d24-c538-4e66-9437-e55e6ef78d08",
    createdAt: "2026-03-28T18:10:00.000000+00:00",
    updatedAt: "2026-03-28T18:15:00.000000+00:00",
    paymentDueAt: "2026-03-30T18:10:00.000000+00:00",
    shippingMode: "UNSELECTED",
    shippingAmountCents: 0,
    subtotalCents: 11000,
    discountTotalCents: 0,
    totalCents: 11000,
    currencyCode: "USD",
    status: "AWAITING_PAYMENT",
    paymentStatus: "REDIRECTED",
    paymentProvider: "STRIPE",
    paidAt: null,
    fulfillmentGroupId: null,
    statusHistory: {
      entries: [
        {
          type: "ORDER_CREATED",
          title: "Order created",
          description: "Order MK-20260328-ABC123 was created.",
          occurredAt: "2026-03-28T18:10:00.000000+00:00",
        },
        {
          type: "PAYMENT_PENDING",
          title: "Awaiting payment",
          description: "Payment is due by Mar 30, 2026 6:10 PM UTC.",
          occurredAt: "2026-03-28T18:15:00.000000+00:00",
        },
        {
          type: "PAYMENT_REDIRECTED",
          title: "Redirected to payment provider",
          description: "The buyer was redirected to STRIPE.",
          occurredAt: "2026-03-28T18:16:00.000000+00:00",
        },
      ],
    },
    lines: [
      {
        id: "b8e8ad96-9b43-4dfb-9658-dfc6b8f28e47",
        offerId: "4ec3f4ad-df1f-43f7-9c74-68702d8d12fb",
        listingId: "05dee38f-6f8e-402e-bc39-9ef63df92956",
        listingSlug: "purple-fluorite-cube",
        title: "Purple Fluorite Cube",
        primaryImageUrl: "https://cdn.example.com/fluorite.jpg",
        mineralName: "Fluorite",
        locality: "Denton Mine, Illinois, USA",
        quantity: 1,
        unitPriceCents: 11000,
        unitDiscountCents: 0,
        unitFinalPriceCents: 11000,
        lineSubtotalCents: 11000,
        lineDiscountCents: 0,
        lineTotalCents: 11000,
      },
    ],
  }
}

function buildPaidSnapshot() {
  return {
    OrderId: ORDER_ID,
    UserId: "41c039fe-1257-4e29-9ad7-f8cd09a2f261",
    OrderNumber: "MK-20260328-ABC123",
    Status: "READY_TO_FULFILL",
    PaymentStatus: "SUCCEEDED",
    PaymentProvider: "STRIPE",
    PaidAt: "2026-03-28T18:18:00.000000+00:00",
    PaymentDueAt: "2026-03-30T18:10:00.000000+00:00",
    TotalCents: 11000,
    CurrencyCode: "USD",
    SourceType: "AUCTION",
    AuctionId: "a7e13d24-c538-4e66-9437-e55e6ef78d08",
    FulfillmentGroupId: null,
    UpdatedAt: "2026-03-28T18:18:00.000000+00:00",
    NewTimelineEntries: [
      {
        type: "READY_TO_FULFILL",
        title: "Ready to fulfill",
        description: "Payment has been confirmed and the order is ready for fulfillment.",
        occurredAt: "2026-03-28T18:18:00.000000+00:00",
      },
    ],
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

async function mockOrderDetail(page: Page, body: unknown, status = 200) {
  await page.route(`**/api/bff/orders/${ORDER_ID}*`, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback()
      return
    }

    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  })
}

async function mockOrderPaymentStart(page: Page) {
  await page.route(`**/api/bff/orders/${ORDER_ID}/payments/start`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        orderPaymentId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        provider: "stripe",
        status: "REDIRECTED",
        redirectUrl: "https://payments.example.com/checkout",
      }),
    })
  })
}

async function mockAuctionShippingChoice(page: Page, options?: { mode?: "SHIP_NOW" | "OPEN_BOX" }) {
  await page.route(`**/api/bff/orders/${ORDER_ID}/auction-shipping-choice`, async (route) => {
    const requested = route.request().postDataJSON() as { shippingMode?: string } | undefined
    const mode = options?.mode ?? (requested?.shippingMode === "OPEN_BOX" ? "OPEN_BOX" : "SHIP_NOW")

    if (mode === "OPEN_BOX") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          orderId: ORDER_ID,
          shippingMode: "OPEN_BOX",
          subtotalCents: 11000,
          discountTotalCents: 0,
          shippingAmountCents: 0,
          totalCents: 11000,
          currencyCode: "USD",
          auctionId: "a7e13d24-c538-4e66-9437-e55e6ef78d08",
          quotedShippingCents: null,
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        orderId: ORDER_ID,
        shippingMode: "SHIP_NOW",
        subtotalCents: 11000,
        discountTotalCents: 0,
        shippingAmountCents: 2500,
        totalCents: 13500,
        currencyCode: "USD",
        auctionId: "a7e13d24-c538-4e66-9437-e55e6ef78d08",
        quotedShippingCents: 2500,
      }),
    })
  })
}

async function mockOrderSsePending(page: Page) {
  await page.route(`**/api/bff/sse/orders/${ORDER_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      },
      body: `event: snapshot
data: ${JSON.stringify({
        OrderId: ORDER_ID,
        UserId: "41c039fe-1257-4e29-9ad7-f8cd09a2f261",
        OrderNumber: "MK-20260328-ABC123",
        Status: "AWAITING_PAYMENT",
        PaymentStatus: "REDIRECTED",
        PaymentProvider: "STRIPE",
        PaidAt: null,
        PaymentDueAt: "2026-03-30T18:10:00.000000+00:00",
        TotalCents: 11000,
        CurrencyCode: "USD",
        SourceType: "AUCTION",
        AuctionId: "a7e13d24-c538-4e66-9437-e55e6ef78d08",
        FulfillmentGroupId: null,
        UpdatedAt: "2026-03-28T18:15:00.000000+00:00",
        NewTimelineEntries: null,
      })}

`,
    })
  })
}

async function mockOrderSsePaid(page: Page) {
  await page.route(`**/api/bff/sse/orders/${ORDER_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      },
      body: `event: snapshot
data: ${JSON.stringify(buildPaidSnapshot())}

`,
    })
  })
}

test.describe("order detail", () => {
  test("initial snapshot render shows order summary, lines, and timeline", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockOrderDetail(page, buildAwaitingPaymentOrder())
    await mockOrderSsePending(page)
    await mockOrderPaymentStart(page)

    await page.goto(ORDER_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("order-detail-card")).toBeVisible()
    await expect(page.getByTestId("order-detail-number")).toContainText("MK-20260328-ABC123")
    await expect(page.getByTestId("order-detail-status")).toContainText("Awaiting payment")
    await expect(page.getByTestId("order-detail-payment-status")).toContainText("Redirected")
    await expect(page.getByTestId("order-detail-payment-provider")).toContainText("Stripe")
    await expect(page.getByTestId("order-detail-total")).toContainText("$110.00")

    await expect(page.getByTestId("order-detail-lines")).toBeVisible()
    await expect(page.getByText("Purple Fluorite Cube")).toBeVisible()
    await expect(page.getByTestId("order-detail-lines")).toContainText("Fluorite")
    await expect(page.getByText(/Denton Mine, Illinois, USA/i)).toBeVisible()

    await expect(page.getByTestId("order-detail-timeline")).toBeVisible()
    await expect(page.getByText("Order created")).toBeVisible()
    await expect(page.getByTestId("order-detail-timeline")).toContainText("Awaiting payment")

    await expect(page.getByTestId("order-detail-live-status")).toContainText(/live updates/i)
  })

  test("sse-driven state update changes order to paid without refresh", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockOrderDetail(page, buildAwaitingPaymentOrder())
    await mockOrderSsePaid(page)
    await mockOrderPaymentStart(page)

    await page.goto(ORDER_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("order-detail-status")).toContainText("Paid / Ready to fulfill")
    await expect(page.getByTestId("order-detail-payment-status")).toContainText("Paid")
    await expect(page.getByTestId("order-detail-paid-state")).toBeVisible()
    await expect(page.getByTestId("order-detail-status")).toContainText("Paid / Ready to fulfill")
  })

  test("unauthenticated user is prompted to sign in again", async ({ page }) => {
    await mockUnauthenticatedSession(page)
    await mockOrderDetail(
      page,
      {
        code: "AUTH_EXPIRED",
        message: "Your session expired. Please sign in again.",
      },
      401,
    )

    await page.goto(ORDER_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("order-detail-error")).toBeVisible()
    await expect(page.getByTestId("order-detail-sign-in-again")).toBeVisible()
  })

  test("non-owner / forbidden state is shown", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockOrderDetail(
      page,
      {
        status: 403,
        code: "FORBIDDEN",
        message: "You do not have access to this order.",
      },
      403,
    )

    await page.goto(ORDER_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("order-detail-error")).toBeVisible()
    await expect(page.getByTestId("order-detail-go-forbidden")).toBeVisible()
  })

  test("redirect params alone do not mark order as paid", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockOrderDetail(page, buildAwaitingPaymentOrder())
    await mockOrderSsePending(page)
    await mockOrderPaymentStart(page)

    await page.goto(
      `${ORDER_URL}?paymentId=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee&status=succeeded`,
      {
        waitUntil: "domcontentloaded",
      },
    )

    await expect(page.getByTestId("order-detail-status")).toContainText("Awaiting payment")
    await expect(page.getByTestId("order-detail-payment-panel")).toBeVisible()
    await expect(page.getByTestId("order-detail-paid-state")).toHaveCount(0)
  })

  test("auction order blocks payment until a shipping choice is selected", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockOrderDetail(page, buildAwaitingPaymentOrder())
    await mockOrderSsePending(page)
    await mockOrderPaymentStart(page)
    await mockAuctionShippingChoice(page)

    await page.goto(ORDER_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("order-detail-auction-shipping-choice-panel")).toBeVisible()
    await expect(page.getByTestId("order-detail-shipping-choice-required")).toBeVisible()

    const payNow = page.getByTestId("order-detail-start-payment")
    await expect(payNow).toBeDisabled()
  })

  test("ship now updates shipping and total before payment", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockOrderDetail(page, buildAwaitingPaymentOrder())
    await mockOrderSsePending(page)
    await mockOrderPaymentStart(page)
    await mockAuctionShippingChoice(page, { mode: "SHIP_NOW" })

    await page.goto(ORDER_URL, { waitUntil: "domcontentloaded" })

    await page.getByTestId("order-detail-shipping-mode-ship-now").check()
    await page.getByTestId("order-detail-save-shipping-choice").click()

    await expect(page.getByTestId("order-detail-shipping-mode")).toContainText("Ship now")
    await expect(page.getByTestId("order-detail-shipping")).toContainText("$25.00")
    await expect(page.getByTestId("order-detail-total")).toContainText("$135.00")
    await expect(page.getByTestId("order-detail-shipping-choice-required")).toHaveCount(0)
    await expect(page.getByTestId("order-detail-start-payment")).toBeEnabled()
  })

  test("open box keeps shipping deferred and total item-only before payment", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockOrderDetail(page, buildAwaitingPaymentOrder())
    await mockOrderSsePending(page)
    await mockOrderPaymentStart(page)
    await mockAuctionShippingChoice(page, { mode: "OPEN_BOX" })

    await page.goto(ORDER_URL, { waitUntil: "domcontentloaded" })

    await page.getByTestId("order-detail-shipping-mode-open-box").check()
    await page.getByTestId("order-detail-save-shipping-choice").click()

    await expect(page.getByTestId("order-detail-shipping-mode")).toContainText("Open Box")
    await expect(page.getByTestId("order-detail-shipping")).toContainText("$0.00")
    await expect(page.getByTestId("order-detail-total")).toContainText("$110.00")
    await expect(page.getByTestId("order-detail-open-box-note")).toBeVisible()
    await expect(page.getByTestId("order-detail-start-payment")).toBeEnabled()
  })
})