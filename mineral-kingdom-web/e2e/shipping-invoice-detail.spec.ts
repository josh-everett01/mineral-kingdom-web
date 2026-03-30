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
    provider: null,
    providerCheckoutId: null,
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
        Provider: null,
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
  test("unpaid shipping invoice renders and shows pay CTA", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockShippingInvoiceDetail(page, buildUnpaidInvoice())
    await mockShippingInvoiceSseUnpaid(page)
    await mockShippingInvoicePay(page)

    await page.goto(INVOICE_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("shipping-invoice-detail-card")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-status")).toContainText("Unpaid")
    await expect(page.getByTestId("shipping-invoice-detail-amount")).toContainText("$42.00")
    await expect(page.getByTestId("shipping-invoice-detail-context")).toContainText(
      /open box/i,
    )
    await expect(page.getByTestId("shipping-invoice-detail-start-payment")).toBeVisible()
  })

  test("paid shipping invoice renders without pay CTA", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockShippingInvoiceDetail(page, buildPaidInvoice())
    await mockShippingInvoiceSsePaid(page)

    await page.goto(INVOICE_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("shipping-invoice-detail-card")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-status")).toContainText("Paid")
    await expect(page.getByTestId("shipping-invoice-detail-paid-state")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-start-payment")).toHaveCount(0)
  })

  test("clicking pay shipping starts payment flow", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockShippingInvoiceDetail(page, buildUnpaidInvoice())
    await mockShippingInvoiceSseUnpaid(page)
    await mockShippingInvoicePay(page)

    await page.goto(INVOICE_URL, { waitUntil: "domcontentloaded" })

    await page.getByTestId("shipping-invoice-detail-provider-stripe").check()

    await page.getByTestId("shipping-invoice-detail-start-payment").click()

    await page.waitForURL("**/mock-shipping-invoice-checkout")

    await expect.poll(async () => {
      return await page.evaluate(() =>
        window.sessionStorage.getItem("mk_shipping_invoice_payment_return_payment_id"),
      )
    }).toBe("ship_pay_123")
  })

  test("invoice SSE paid transition updates UI without refresh", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockShippingInvoiceDetail(page, buildUnpaidInvoice())
    await mockShippingInvoiceSsePaid(page)

    await page.goto(INVOICE_URL, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("shipping-invoice-detail-status")).toContainText("Paid")
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
    await expect(page.getByTestId("shipping-invoice-detail-paid-state")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-start-payment")).toHaveCount(0)

    // Simulate SSE becoming unavailable after the page has already reached paid state.
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
    await expect(page.getByTestId("shipping-invoice-detail-paid-state")).toBeVisible()
    await expect(page.getByTestId("shipping-invoice-detail-start-payment")).toHaveCount(0)
  })
})