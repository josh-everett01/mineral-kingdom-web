import { expect, test, type Page } from "@playwright/test"

const INVOICE_ID = "1b3a4b9d-6b1f-4d9b-8d54-7b2f1e88aa11"
const INVOICE_URL = `/shipping-invoices/${INVOICE_ID}`

function buildUnpaidInvoice() {
  return {
    shippingInvoiceId: INVOICE_ID,
    fulfillmentGroupId: "f1111111-2222-3333-4444-555555555555",
    amountCents: 4200,
    currencyCode: "USD",
    status: "UNPAID",
    paidAt: null,
    provider: "STRIPE",
    providerCheckoutId: "ship_pay_123",
    dueAt: "2026-03-31T16:00:00.000000+00:00",
    createdAt: "2026-03-29T15:55:00.000000+00:00",
    updatedAt: "2026-03-29T16:00:00.000000+00:00",
    itemCount: 1,
    previewTitle: "Quartz Cluster",
    previewImageUrl: "https://cdn.example.com/quartz.jpg",
    auctionOrderCount: 1,
    storeOrderCount: 0,
    relatedOrders: [
      {
        orderId: "99999999-1111-2222-3333-444444444444",
        orderNumber: "MK-20260329-SHIP01",
        sourceType: "AUCTION",
      },
    ],
    items: [
      {
        orderId: "99999999-1111-2222-3333-444444444444",
        orderNumber: "MK-20260329-SHIP01",
        sourceType: "AUCTION",
        listingId: "05dee38f-6f8e-402e-bc39-9ef63df92956",
        listingSlug: "quartz-cluster",
        title: "Quartz Cluster",
        primaryImageUrl: "https://cdn.example.com/quartz.jpg",
        mineralName: "Quartz",
        locality: "Arkansas, USA",
        quantity: 1,
      },
    ],
  }
}

function buildMultiItemInvoice() {
  return {
    shippingInvoiceId: INVOICE_ID,
    fulfillmentGroupId: "f1111111-2222-3333-4444-555555555555",
    amountCents: 8600,
    currencyCode: "USD",
    status: "UNPAID",
    paidAt: null,
    provider: "STRIPE",
    providerCheckoutId: "ship_pay_456",
    dueAt: "2026-03-31T16:00:00.000000+00:00",
    createdAt: "2026-03-29T15:55:00.000000+00:00",
    updatedAt: "2026-03-29T16:00:00.000000+00:00",
    itemCount: 3,
    previewTitle: "Quartz Cluster",
    previewImageUrl: "https://cdn.example.com/quartz.jpg",
    auctionOrderCount: 1,
    storeOrderCount: 1,
    relatedOrders: [
      {
        orderId: "99999999-1111-2222-3333-444444444444",
        orderNumber: "MK-20260329-SHIP01",
        sourceType: "AUCTION",
      },
      {
        orderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        orderNumber: "MK-20260329-SHIP02",
        sourceType: "STORE",
      },
    ],
    items: [
      {
        orderId: "99999999-1111-2222-3333-444444444444",
        orderNumber: "MK-20260329-SHIP01",
        sourceType: "AUCTION",
        listingId: "05dee38f-6f8e-402e-bc39-9ef63df92956",
        listingSlug: "quartz-cluster",
        title: "Quartz Cluster",
        primaryImageUrl: "https://cdn.example.com/quartz.jpg",
        mineralName: "Quartz",
        locality: "Arkansas, USA",
        quantity: 1,
      },
      {
        orderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        orderNumber: "MK-20260329-SHIP02",
        sourceType: "STORE",
        listingId: "11111111-2222-3333-4444-555555555555",
        listingSlug: "fluorite-cube",
        title: "Fluorite Cube",
        primaryImageUrl: "https://cdn.example.com/fluorite.jpg",
        mineralName: "Fluorite",
        locality: "Illinois, USA",
        quantity: 1,
      },
      {
        orderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        orderNumber: "MK-20260329-SHIP02",
        sourceType: "STORE",
        listingId: "66666666-7777-8888-9999-000000000000",
        listingSlug: "azurite-sun",
        title: "Azurite Sun",
        primaryImageUrl: null,
        mineralName: "Azurite",
        locality: "Mexico",
        quantity: 1,
      },
    ],
  }
}

function buildMissingThumbnailInvoice() {
  return {
    shippingInvoiceId: INVOICE_ID,
    fulfillmentGroupId: "f1111111-2222-3333-4444-555555555555",
    amountCents: 4200,
    currencyCode: "USD",
    status: "UNPAID",
    paidAt: null,
    provider: "STRIPE",
    providerCheckoutId: "ship_pay_789",
    dueAt: "2026-03-31T16:00:00.000000+00:00",
    createdAt: "2026-03-29T15:55:00.000000+00:00",
    updatedAt: "2026-03-29T16:00:00.000000+00:00",
    itemCount: 1,
    previewTitle: "Azurite Sun",
    previewImageUrl: null,
    auctionOrderCount: 0,
    storeOrderCount: 1,
    relatedOrders: [
      {
        orderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        orderNumber: "MK-20260329-SHIP02",
        sourceType: "STORE",
      },
    ],
    items: [
      {
        orderId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        orderNumber: "MK-20260329-SHIP02",
        sourceType: "STORE",
        listingId: "66666666-7777-8888-9999-000000000000",
        listingSlug: "azurite-sun",
        title: "Azurite Sun",
        primaryImageUrl: null,
        mineralName: "Azurite",
        locality: "Mexico",
        quantity: 1,
      },
    ],
  }
}

function buildPaidInvoice() {
  return {
    shippingInvoiceId: INVOICE_ID,
    fulfillmentGroupId: "f1111111-2222-3333-4444-555555555555",
    amountCents: 4200,
    currencyCode: "USD",
    status: "PAID",
    paidAt: "2026-03-29T16:10:00.000000+00:00",
    provider: "STRIPE",
    providerCheckoutId: "pi_test_123",
    dueAt: "2026-03-31T16:00:00.000000+00:00",
    createdAt: "2026-03-29T15:55:00.000000+00:00",
    updatedAt: "2026-03-29T16:10:00.000000+00:00",
    itemCount: 1,
    previewTitle: "Quartz Cluster",
    previewImageUrl: "https://cdn.example.com/quartz.jpg",
    auctionOrderCount: 1,
    storeOrderCount: 0,
    relatedOrders: [
      {
        orderId: "99999999-1111-2222-3333-444444444444",
        orderNumber: "MK-20260329-SHIP01",
        sourceType: "AUCTION",
      },
    ],
    items: [
      {
        orderId: "99999999-1111-2222-3333-444444444444",
        orderNumber: "MK-20260329-SHIP01",
        sourceType: "AUCTION",
        listingId: "05dee38f-6f8e-402e-bc39-9ef63df92956",
        listingSlug: "quartz-cluster",
        title: "Quartz Cluster",
        primaryImageUrl: "https://cdn.example.com/quartz.jpg",
        mineralName: "Quartz",
        locality: "Arkansas, USA",
        quantity: 1,
      },
    ],
  }
}

async function mockAuthenticatedSession(page: Page) {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        emailVerified: true,
        user: {
          id: "99999999-9999-9999-9999-999999999999",
          email: "shipping-invoice@example.com",
        },
        roles: [],
      }),
    })
  })
}

async function mockShippingInvoiceDetail(
  page: Page,
  invoice: Record<string, unknown>,
  status = 200,
) {
  await page.route(`**/api/bff/shipping-invoices/${INVOICE_ID}`, async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(invoice),
    })
  })
}

async function mockShippingInvoicePay(page: Page) {
  await page.route("**/mock-shipping-invoice-checkout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body><h1>Mock shipping invoice checkout</h1></body></html>",
    })
  })

  await page.route(`**/api/bff/shipping-invoices/${INVOICE_ID}/pay`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        shippingInvoicePaymentId: "ship_pay_123",
        provider: "STRIPE",
        status: "REDIRECTED",
        redirectUrl: "/mock-shipping-invoice-checkout",
      }),
    })
  })
}

async function mockShippingInvoiceSseUnpaid(page: Page) {
  await page.route(`**/api/bff/sse/shipping-invoices/${INVOICE_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
      body: `event: snapshot
data: ${JSON.stringify({
        ShippingInvoiceId: INVOICE_ID,
        FulfillmentGroupId: "f1111111-2222-3333-4444-555555555555",
        AmountCents: 4200,
        CurrencyCode: "USD",
        Status: "UNPAID",
        PaidAt: null,
        Provider: "STRIPE",
        UpdatedAt: "2026-03-29T16:00:00.000000+00:00",
      })}

`,
    })
  })
}

async function mockShippingInvoiceSsePaid(page: Page) {
  await page.route(`**/api/bff/sse/shipping-invoices/${INVOICE_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
      body: `event: snapshot
data: ${JSON.stringify({
        ShippingInvoiceId: INVOICE_ID,
        FulfillmentGroupId: "f1111111-2222-3333-4444-555555555555",
        AmountCents: 4200,
        CurrencyCode: "USD",
        Status: "PAID",
        PaidAt: "2026-03-29T16:10:00.000000+00:00",
        Provider: "STRIPE",
        UpdatedAt: "2026-03-29T16:10:00.000000+00:00",
      })}

`,
    })
  })
}

test.describe("shipping invoice detail", () => {
  test("unpaid shipping invoice renders payment context, covered items, and pay CTA", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockShippingInvoiceDetail(page, buildUnpaidInvoice())
    await mockShippingInvoiceSseUnpaid(page)
    await mockShippingInvoicePay(page)

    await page.goto(INVOICE_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("shipping-invoice-detail-card")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-status")).toContainText("Unpaid")
    await expect(page.getByTestId("shipping-invoice-detail-amount")).toContainText("$42.00")
    await expect(page.getByTestId("shipping-invoice-detail-payment-context")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-payment-context")).toContainText(
      "Shipping payment",
    )
    await expect(page.getByTestId("shipping-invoice-detail-payment-context")).toContainText(
      "Quartz Cluster",
    )
    await expect(page.getByTestId("shipping-invoice-detail-payment-context")).toContainText(
      "Shipping invoice • Open Box • Order MK-20260329-SHIP01",
    )
    await expect(page.getByTestId("shipping-invoice-detail-payment-context")).toContainText(
      "Shipping payment only",
    )

    await expect(page.getByTestId("shipping-invoice-detail-items")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-items")).toContainText(
      "This invoice covers shipping for",
    )
    await expect(page.getByTestId("shipping-invoice-detail-items")).toContainText(
      "Quartz Cluster",
    )
    await expect(page.getByTestId("shipping-invoice-detail-items")).toContainText(
      "Order MK-20260329-SHIP01 • AUCTION",
    )

    await expect(page.getByTestId("shipping-invoice-detail-awaiting-confirmation")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-start-payment")).toBeVisible()
  })

  test("single-item invoice context is rendered clearly", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockShippingInvoiceDetail(page, buildUnpaidInvoice())
    await mockShippingInvoiceSseUnpaid(page)

    await page.goto(INVOICE_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("shipping-invoice-detail-payment-context")).toContainText(
      "Quartz Cluster",
    )
    await expect(page.getByTestId("shipping-invoice-detail-item-row")).toHaveCount(1)
    await expect(page.getByTestId("shipping-invoice-detail-items")).toContainText(
      "Quartz"
    )
    await expect(page.getByTestId("shipping-invoice-detail-items")).toContainText(
      "Arkansas, USA"
    )
  })

  test("multi-item multi-order invoice remains scannable and grouped", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockShippingInvoiceDetail(page, buildMultiItemInvoice())
    await mockShippingInvoiceSseUnpaid(page)

    await page.goto(INVOICE_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("shipping-invoice-detail-payment-context")).toContainText(
      "Quartz Cluster + 2 more",
    )
    await expect(page.getByTestId("shipping-invoice-detail-payment-context")).toContainText(
      "Shipping invoice • Open Box • Order MK-20260329-SHIP01 + 1 more",
    )

    await expect(page.getByTestId("shipping-invoice-detail-item-row")).toHaveCount(3)
    await expect(page.getByTestId("shipping-invoice-detail-items")).toContainText(
      "Order MK-20260329-SHIP01 • AUCTION",
    )
    await expect(page.getByTestId("shipping-invoice-detail-items")).toContainText(
      "Order MK-20260329-SHIP02 • STORE",
    )
    await expect(page.getByTestId("shipping-invoice-detail-items")).toContainText(
      "Fluorite Cube",
    )
    await expect(page.getByTestId("shipping-invoice-detail-items")).toContainText(
      "Azurite Sun",
    )
  })

  test("missing thumbnail fallback renders for covered items", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockShippingInvoiceDetail(page, buildMissingThumbnailInvoice())
    await mockShippingInvoiceSseUnpaid(page)

    await page.goto(INVOICE_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("shipping-invoice-detail-payment-context")).toContainText(
      "Azurite Sun",
    )
    await expect(page.getByTestId("shipping-invoice-detail-items")).toContainText("No image")
    await expect(page.getByTestId("shipping-invoice-detail-items")).toContainText(
      "Order MK-20260329-SHIP02 • STORE",
    )
  })

  test("paid shipping invoice renders confirmed payment messaging without pay CTA", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockShippingInvoiceDetail(page, buildPaidInvoice())
    await mockShippingInvoiceSsePaid(page)

    await page.goto(INVOICE_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("shipping-invoice-detail-card")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-status")).toContainText("Paid")
    await expect(page.getByTestId("shipping-invoice-detail-payment-confirmed")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-paid-state")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-items")).toContainText(
      "Quartz Cluster",
    )
    await expect(page.getByTestId("shipping-invoice-detail-start-payment")).toHaveCount(0)
  })

  test("clicking pay shipping starts payment flow", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockShippingInvoiceDetail(page, buildUnpaidInvoice())
    await mockShippingInvoiceSseUnpaid(page)

    let payRequestSeen = false

    await page.route("**/mock-shipping-invoice-checkout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body><h1>Mock shipping invoice checkout</h1></body></html>",
      })
    })

    await page.route(`**/api/bff/shipping-invoices/${INVOICE_ID}/pay`, async (route) => {
      payRequestSeen = true

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          shippingInvoicePaymentId: "ship_pay_123",
          provider: "STRIPE",
          status: "REDIRECTED",
          redirectUrl: "/mock-shipping-invoice-checkout",
        }),
      })
    })

    await page.goto(INVOICE_URL, { waitUntil: "domcontentloaded" })

    await page.getByTestId("shipping-invoice-detail-provider-stripe").check()
    await page.getByTestId("shipping-invoice-detail-start-payment").click()

    await expect.poll(() => payRequestSeen).toBe(true)
    await expect(page.getByTestId("shipping-invoice-detail-card")).toBeVisible()
  })

  test("invoice SSE paid transition updates UI without refresh", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockShippingInvoiceDetail(page, buildUnpaidInvoice())
    await mockShippingInvoiceSsePaid(page)

    await page.goto(INVOICE_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("shipping-invoice-detail-status")).toContainText("Paid")
    await expect(page.getByTestId("shipping-invoice-detail-payment-confirmed")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-paid-state")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-start-payment")).toHaveCount(0)
  })

  test("invoice remains paid if SSE disconnects after paid state is reached", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockShippingInvoiceDetail(page, buildPaidInvoice())

    await page.route(`**/api/bff/sse/shipping-invoices/${INVOICE_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
        },
        body: `event: snapshot
data: ${JSON.stringify({
          ShippingInvoiceId: INVOICE_ID,
          FulfillmentGroupId: "f1111111-2222-3333-4444-555555555555",
          AmountCents: 4200,
          CurrencyCode: "USD",
          Status: "PAID",
          PaidAt: "2026-03-29T16:10:00.000000+00:00",
          Provider: "STRIPE",
          UpdatedAt: "2026-03-29T16:10:00.000000+00:00",
        })}

`
      })
    })

    await page.goto(INVOICE_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("shipping-invoice-detail-status")).toContainText("Paid")
    await expect(page.getByTestId("shipping-invoice-detail-payment-confirmed")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-paid-state")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-start-payment")).toHaveCount(0)

    await page.unroute(`**/api/bff/sse/shipping-invoices/${INVOICE_ID}`)
    await page.route(`**/api/bff/sse/shipping-invoices/${INVOICE_ID}`, async (route) => {
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

    await expect(page.getByTestId("shipping-invoice-detail-status")).toContainText("Paid")
    await expect(page.getByTestId("shipping-invoice-detail-payment-confirmed")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-paid-state")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-start-payment")).toHaveCount(0)
  })

  test("stale paid shipping invoice does not render pay shipping CTA", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockShippingInvoiceDetail(page, buildPaidInvoice())
    await mockShippingInvoiceSsePaid(page)

    await page.goto(INVOICE_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("shipping-invoice-detail-status")).toContainText("Paid")
    await expect(page.getByTestId("shipping-invoice-detail-start-payment")).toHaveCount(0)
  })
})