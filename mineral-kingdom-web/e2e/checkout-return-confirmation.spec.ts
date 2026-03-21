import { test, expect } from "@playwright/test"

test("checkout return page redirects to confirmed order after backend payment confirmation", async ({
  page,
}) => {
  const paymentId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
  const orderId = "11111111-2222-3333-4444-555555555555"

  await page.addInitScript((storedPaymentId: string) => {
    window.sessionStorage.setItem("mk_checkout_payment_id", storedPaymentId)
  }, paymentId)

  await page.route(`**/api/bff/sse/checkout-payments/${paymentId}`, async (route) => {
    await route.abort()
  })

  await page.route(`**/api/bff/payments/${paymentId}/confirmation`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        paymentId,
        provider: "paypal",
        paymentStatus: "SUCCEEDED",
        isConfirmed: true,
        orderId,
        orderNumber: "MK-20260321-ABC123",
        orderStatus: "READY_TO_FULFILL",
        orderTotalCents: 21900,
        orderCurrencyCode: "USD",
        guestEmail: "guest@example.com",
      }),
    })
  })

  await page.route(`**/api/bff/orders/${orderId}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: orderId,
        orderNumber: "MK-20260321-ABC123",
        status: "READY_TO_FULFILL",
        totalCents: 21900,
        currencyCode: "USD",
        paymentStatus: "SUCCEEDED",
        provider: "paypal",
        guestEmail: "guest@example.com",
        isConfirmed: true,
      }),
    })
  })

  await page.route("**/api/bff/cart", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "cart-test-id",
        status: "ACTIVE",
        lines: [],
        notices: [],
      }),
    })
  })

  await page.goto("/checkout/return", { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("checkout-return-page")).toBeVisible()

  await page.waitForURL((url) => url.pathname === "/order-confirmation", {
    timeout: 10000,
  })

  await expect(page.getByTestId("order-confirmation-page")).toBeVisible()
  await expect(page.getByTestId("order-confirmation-card")).toBeVisible()
})