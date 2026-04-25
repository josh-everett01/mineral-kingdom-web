import { test, expect, type Page } from "@playwright/test"

const hasBackend = !!process.env.E2E_BACKEND
const APP_ORIGIN = "http://127.0.0.1:3005"
const BACKEND_ORIGIN = "http://127.0.0.1:8080"

const AMETHYST_OFFER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6"
const CELESTITE_OFFER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa9"

async function reseedBackend(request: import("@playwright/test").APIRequestContext) {
  const response = await request.post(`${BACKEND_ORIGIN}/api/testing/e2e/seed`)
  expect(response.ok()).toBeTruthy()
}

async function seedCartLineViaBff(page: Page, offerId: string) {
  const bootstrap = await page.request.get(`${APP_ORIGIN}/api/bff/cart`)
  expect(bootstrap.ok()).toBeTruthy()

  const setCookieHeader = bootstrap.headers()["set-cookie"]
  const match = setCookieHeader?.match(/mk_cart_id=([^;]+)/)
  expect(match?.[1]).toBeTruthy()

  const cartId = match![1]

  await page.context().addCookies([
    {
      name: "mk_cart_id",
      value: cartId,
      url: APP_ORIGIN,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ])

  const addRes = await page.request.put(`${APP_ORIGIN}/api/bff/cart`, {
    headers: {
      cookie: `mk_cart_id=${cartId}`,
      "content-type": "application/json",
    },
    data: {
      offerId,
      quantity: 1,
    },
  })

  expect(addRes.ok()).toBeTruthy()
}

async function createGuestCheckoutHoldViaBff(page: Page, offerId: string, email: string) {
  const bootstrap = await page.request.get(`${APP_ORIGIN}/api/bff/cart`)
  expect(bootstrap.ok()).toBeTruthy()

  const setCookieHeader = bootstrap.headers()["set-cookie"]
  const match = setCookieHeader?.match(/mk_cart_id=([^;]+)/)
  expect(match?.[1]).toBeTruthy()

  const cartId = match![1]

  await page.context().addCookies([
    {
      name: "mk_cart_id",
      value: cartId,
      url: APP_ORIGIN,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ])

  const addRes = await page.request.put(`${APP_ORIGIN}/api/bff/cart`, {
    headers: {
      cookie: `mk_cart_id=${cartId}`,
      "content-type": "application/json",
    },
    data: {
      offerId,
      quantity: 1,
    },
  })

  expect(addRes.ok()).toBeTruthy()

  const startRes = await page.request.post(`${APP_ORIGIN}/api/bff/checkout/start`, {
    headers: {
      cookie: `mk_cart_id=${cartId}`,
      "content-type": "application/json",
    },
    data: {
      cartId,
      email,
    },
  })

  expect(startRes.ok()).toBeTruthy()

  const body = (await startRes.json()) as {
    cartId: string
    holdId: string
    expiresAt: string
  }

  expect(body.cartId).toBeTruthy()
  expect(body.holdId).toBeTruthy()
  expect(body.expiresAt).toBeTruthy()

  return body
}

async function setStoredCheckoutPaymentId(page: Page, paymentId: string) {
  await page.addInitScript((id: string) => {
    window.sessionStorage.setItem("mk_checkout_payment_id", id)
  }, paymentId)
}

async function waitForCheckoutPostStartState(page: Page) {
  await expect
    .poll(
      async () => {
        const url = new URL(page.url())
        const hasHoldParams =
          Boolean(url.searchParams.get("holdId")) &&
          Boolean(url.searchParams.get("cartId")) &&
          Boolean(url.searchParams.get("expiresAt"))

        const hasContinueLink = await page
          .getByTestId("checkout-continue-to-payment")
          .isVisible()
          .catch(() => false)

        const hasActiveHold = await page
          .getByTestId("checkout-active-hold")
          .isVisible()
          .catch(() => false)

        const hasPayPage = await page
          .getByTestId("checkout-pay-page")
          .isVisible()
          .catch(() => false)

        if (hasPayPage) return "pay"
        if (hasContinueLink || hasActiveHold || hasHoldParams) return "hold"
        return "pending"
      },
      { timeout: 15_000 },
    )
    .toMatch(/hold|pay/)

  const url = new URL(page.url())
  const hasHoldParams =
    Boolean(url.searchParams.get("holdId")) &&
    Boolean(url.searchParams.get("cartId")) &&
    Boolean(url.searchParams.get("expiresAt"))

  const hasContinueLink = await page
    .getByTestId("checkout-continue-to-payment")
    .isVisible()
    .catch(() => false)

  const hasActiveHold = await page
    .getByTestId("checkout-active-hold")
    .isVisible()
    .catch(() => false)

  const hasPayPage = await page
    .getByTestId("checkout-pay-page")
    .isVisible()
    .catch(() => false)

  if (hasPayPage) return "pay" as const
  if (hasContinueLink || hasActiveHold || hasHoldParams) return "hold" as const
  return "pending" as const
}

test.describe("checkout flows (backend required)", () => {
  test.describe.configure({ mode: "serial" })
  test.skip(!hasBackend, "Requires backend running (set E2E_BACKEND=1).")

  test.beforeEach(async ({ request, page, context }) => {
    await context.clearCookies()
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await reseedBackend(request)
  })

  test("guest can proceed from cart to checkout and start a hold", async ({ page }) => {
    await seedCartLineViaBff(page, AMETHYST_OFFER_ID)

    await page.goto("/cart", { waitUntil: "domcontentloaded" })

    await expect(page).toHaveURL(/\/cart$/)
    await expect(page.getByTestId("cart-page")).toBeVisible()
    await expect(page.getByTestId("cart-line")).toHaveCount(1, { timeout: 15_000 })
    await expect(page.getByTestId("cart-checkout-link")).toBeVisible()

    await page.getByTestId("cart-checkout-link").click()

    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByTestId("checkout-page")).toBeVisible()
    await expect(page.getByTestId("checkout-start-card")).toBeVisible()

    await page.getByTestId("checkout-guest-email").fill(`guest-${Date.now()}@example.com`)
    await page.getByTestId("checkout-start-button").click()

    await page.waitForURL(/\/checkout(\/pay)?(\?.*)?$/, { timeout: 15_000 })

    const error = page.getByTestId("checkout-start-error")
    if (await error.isVisible().catch(() => false)) {
      throw new Error(`Checkout start showed an error: ${await error.textContent()}`)
    }

    const state = await waitForCheckoutPostStartState(page)

    if (state === "hold") {
      const url = new URL(page.url())
      const hasHoldParams =
        Boolean(url.searchParams.get("holdId")) &&
        Boolean(url.searchParams.get("cartId")) &&
        Boolean(url.searchParams.get("expiresAt"))

      if (await page.getByTestId("checkout-active-hold").isVisible().catch(() => false)) {
        await expect(page.getByTestId("checkout-active-hold")).toBeVisible({ timeout: 15_000 })
        await expect(page.getByTestId("checkout-cart-id")).toBeVisible()
        await expect(page.getByTestId("checkout-hold-id")).toBeVisible()
        await expect(page.getByTestId("checkout-expires-at")).toBeVisible()
        await expect(page.getByTestId("checkout-countdown")).toBeVisible()
        await expect(page.getByTestId("checkout-extension-count")).toBeVisible()
        await expect(page.getByTestId("checkout-continue-to-payment")).toBeVisible()
      } else {
        expect(hasHoldParams).toBeTruthy()
      }
    } else {
      await expect(page.getByTestId("checkout-pay-page")).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId("checkout-pay-hold-id")).toBeVisible()
      await expect(page.getByTestId("checkout-pay-countdown")).toBeVisible()
      await expect(page.getByTestId("checkout-pay-extension-count")).toBeVisible()
      await expect(page.getByTestId("checkout-pay-start")).toBeVisible()
    }
  })

  test("guest can continue from active checkout hold to payment page", async ({ page }) => {
    await seedCartLineViaBff(page, CELESTITE_OFFER_ID)

    await page.goto("/cart", { waitUntil: "domcontentloaded" })

    await expect(page).toHaveURL(/\/cart$/)
    await expect(page.getByTestId("cart-page")).toBeVisible()
    await expect(page.getByTestId("cart-line")).toHaveCount(1, { timeout: 15_000 })
    await expect(page.getByTestId("cart-checkout-link")).toBeVisible()

    await page.getByTestId("cart-checkout-link").click()

    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByTestId("checkout-page")).toBeVisible()
    await expect(page.getByTestId("checkout-start-card")).toBeVisible()

    await page.getByTestId("checkout-guest-email").fill(`guest-${Date.now()}-2@example.com`)
    await page.getByTestId("checkout-start-button").click()

    await page.waitForURL(/\/checkout(\/pay)?(\?.*)?$/, { timeout: 15_000 })

    const startError = page.getByTestId("checkout-start-error")
    if (await startError.isVisible().catch(() => false)) {
      throw new Error(`Checkout start showed an error: ${await startError.textContent()}`)
    }

    const state = await waitForCheckoutPostStartState(page)

    if (
      state === "hold" &&
      ((await page.getByTestId("checkout-continue-to-payment").isVisible().catch(() => false)) ||
        (await page.getByTestId("checkout-active-hold").isVisible().catch(() => false)))
    ) {
      const holdId = (await page.getByTestId("checkout-hold-id").textContent())?.trim()
      expect(holdId).toBeTruthy()

      await page.getByTestId("checkout-continue-to-payment").click()

      await expect(page).toHaveURL(/\/checkout\/pay/)
      await expect(page.getByTestId("checkout-pay-page")).toBeVisible()
      await expect(page.getByTestId("checkout-pay-hold-id")).toBeVisible()
      await expect(page.getByTestId("checkout-pay-countdown")).toBeVisible()
      await expect(page.getByTestId("checkout-pay-extension-count")).toBeVisible()
      await expect(page.getByTestId("checkout-pay-start")).toBeVisible()
      await expect(page.getByTestId("checkout-pay-hold-id")).toContainText(holdId!)
      return
    }

    if (state === "pay") {
      await expect(page.getByTestId("checkout-pay-page")).toBeVisible({ timeout: 15_000 })
      await expect(page.getByTestId("checkout-pay-hold-id")).toBeVisible()
      await expect(page.getByTestId("checkout-pay-countdown")).toBeVisible()
      await expect(page.getByTestId("checkout-pay-extension-count")).toBeVisible()
      await expect(page.getByTestId("checkout-pay-start")).toBeVisible()
      return
    }

    const url = new URL(page.url())
    const holdId = url.searchParams.get("holdId")
    expect(holdId).toBeTruthy()

    await page.goto(`/checkout/pay?holdId=${encodeURIComponent(holdId!)}`, {
      waitUntil: "domcontentloaded",
    })

    await expect(page.getByTestId("checkout-pay-page")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-hold-id")).toContainText(holdId!)
    await expect(page.getByTestId("checkout-pay-countdown")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-extension-count")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-start")).toBeVisible()
  })

  test("payment page requires checkout hold when none is available", async ({ page }) => {
    await page.goto("/checkout/pay", { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("checkout-pay-page")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-missing-hold")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /a checkout hold is required before payment can begin/i }),
    ).toBeVisible()
    await expect(page.getByTestId("checkout-pay-return-to-checkout")).toBeVisible()
  })

  test("store checkout pay page shows summary, hold timer, and region selector", async ({
    page,
  }) => {
    const checkout = await createGuestCheckoutHoldViaBff(
      page,
      AMETHYST_OFFER_ID,
      `guest-${Date.now()}@example.com`,
    )

    await page.goto(`/checkout/pay?holdId=${encodeURIComponent(checkout.holdId)}`, {
      waitUntil: "domcontentloaded",
    })

    await expect(page.getByTestId("checkout-pay-page")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-summary-card")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-summary-title")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-summary-context")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-hold-id")).toContainText(checkout.holdId)
    await expect(page.getByTestId("checkout-pay-countdown")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-extension-count")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-region-select")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-region-summary")).toBeVisible()
  })

  test("store checkout pay page updates selected region label when region changes", async ({
    page,
  }) => {
    const checkout = await createGuestCheckoutHoldViaBff(
      page,
      AMETHYST_OFFER_ID,
      `guest-${Date.now()}@example.com`,
    )

    let previewCallCount = 0

    await page.route("**/api/bff/checkout/preview-pricing", async (route) => {
      previewCallCount += 1

      const request = route.request()
      const body = request.postDataJSON() as {
        holdId?: string
        shippingMode?: string
        selectedRegionCode?: string | null
      }

      const region = body.selectedRegionCode ?? "US"

      if (region === "CA") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            holdId: checkout.holdId,
            subtotalCents: 24900,
            shippingAmountCents: 5500,
            totalCents: 30400,
            currencyCode: "USD",
            shippingMode: "SHIP_NOW",
            selectedRegionCode: "CA",
          }),
        })
        return
      }

      if (region === "ROW") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            holdId: checkout.holdId,
            subtotalCents: 24900,
            shippingAmountCents: 8500,
            totalCents: 33400,
            currencyCode: "USD",
            shippingMode: "SHIP_NOW",
            selectedRegionCode: "ROW",
          }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          holdId: checkout.holdId,
          subtotalCents: 24900,
          shippingAmountCents: 4500,
          totalCents: 29400,
          currencyCode: "USD",
          shippingMode: "SHIP_NOW",
          selectedRegionCode: "US",
        }),
      })
    })

    await page.goto(`/checkout/pay?holdId=${encodeURIComponent(checkout.holdId)}`, {
      waitUntil: "domcontentloaded",
    })

    await expect(page.getByTestId("checkout-pay-page")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-region-select")).toHaveValue("US")
    await expect(page.getByTestId("checkout-pay-region-label")).toContainText(/US/i)
    await expect(page.getByTestId("checkout-pay-preview-total")).toContainText("$294.00")

    await page.getByTestId("checkout-pay-region-select").selectOption("CA")
    await expect(page.getByTestId("checkout-pay-region-select")).toHaveValue("CA")
    await expect(page.getByTestId("checkout-pay-region-label")).toContainText(/Canada/i)
    await expect(page.getByTestId("checkout-pay-preview-shipping")).toContainText("$55.00")
    await expect(page.getByTestId("checkout-pay-preview-total")).toContainText("$304.00")

    await page.getByTestId("checkout-pay-region-select").selectOption("ROW")
    await expect(page.getByTestId("checkout-pay-region-select")).toHaveValue("ROW")
    await expect(page.getByTestId("checkout-pay-region-label")).toContainText(/Rest of World/i)
    await expect(page.getByTestId("checkout-pay-preview-shipping")).toContainText("$85.00")
    await expect(page.getByTestId("checkout-pay-preview-total")).toContainText("$334.00")

    expect(previewCallCount).toBeGreaterThan(0)
  })

  test("store checkout pay page does not show expired messaging while active hold is valid", async ({
    page,
  }) => {
    const checkout = await createGuestCheckoutHoldViaBff(
      page,
      AMETHYST_OFFER_ID,
      `guest-${Date.now()}@example.com`,
    )

    await page.goto(`/checkout/pay?holdId=${encodeURIComponent(checkout.holdId)}`, {
      waitUntil: "domcontentloaded",
    })

    await expect(page.getByTestId("checkout-pay-page")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-hold-id")).toContainText(checkout.holdId)
    await expect(page.getByTestId("checkout-pay-countdown")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-start")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-missing-hold")).toHaveCount(0)
    await expect(page.getByTestId("checkout-pay-error")).toHaveCount(0)
  })
})

test.describe("checkout return page", () => {
  test("stays neutral when no payment session is available", async ({ page }) => {
    await page.goto("/checkout/return", { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("checkout-return-page")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /we recorded your return from the payment provider/i }),
    ).toBeVisible()

    await expect(page.getByTestId("checkout-return-status-message")).toBeVisible()
    await expect(page.getByTestId("checkout-return-copy")).toContainText(
      /never treated as proof of payment/i,
    )
    await expect(page.getByTestId("checkout-return-status-message")).toContainText(
      /confirming payment now|waiting for backend payment confirmation/i,
    )
  })

  test("does not trust provider redirect params as paid proof", async ({ page }) => {
    await page.goto("/checkout/return?success=1&status=paid&orderId=fake-order-123", {
      waitUntil: "domcontentloaded",
    })

    await expect(page.getByTestId("checkout-return-page")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /we recorded your return from the payment provider/i }),
    ).toBeVisible()
    await expect(page.getByTestId("checkout-return-copy")).toContainText(
      /never treated as proof of payment/i,
    )
    await expect(page.getByTestId("checkout-return-status-message")).toBeVisible()
  })

  test("shows cancelled state without marking order paid", async ({ page }) => {
    await page.goto("/checkout/return?cancelled=1", { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("checkout-return-page")).toBeVisible()
    await expect(page.getByTestId("checkout-return-cancelled")).toBeVisible()
    await expect(page.getByTestId("checkout-return-copy")).toContainText(
      /never treated as proof of payment/i,
    )
    await expect(page.getByTestId("checkout-return-cancelled")).toContainText(
      /cancelled\. no purchase was confirmed/i,
    )
  })

  test("shows pending confirmation UX with progress, warning, and live status", async ({
    page,
  }) => {
    const paymentId = "5935a82d-61f9-448b-bea3-e98d37063814"

    await setStoredCheckoutPaymentId(page, paymentId)

    await page.route(`**/api/bff/payments/${paymentId}/confirmation`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          paymentId,
          provider: "stripe",
          paymentStatus: "REDIRECTED",
          isConfirmed: false,
          orderId: null,
          orderNumber: null,
          orderStatus: null,
          orderTotalCents: null,
          orderCurrencyCode: null,
          guestEmail: null,
        }),
      })
    })

    await page.route(`**/api/bff/sse/checkout-payments/${paymentId}`, async (route) => {
      await route.abort()
    })

    await page.goto("/checkout/return", { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("checkout-return-page")).toBeVisible()
    await expect(page.getByTestId("checkout-return-status-message")).toBeVisible()
    await expect(page.getByTestId("checkout-return-progress")).toBeVisible()
    await expect(page.getByTestId("checkout-return-status-message")).toContainText(
      /confirming payment now/i,
    )

    await expect(
      page.getByTestId("checkout-return-status-message").getByText("Please keep this page open", {
        exact: true,
      }),
    ).toBeVisible()

    const progress = page.getByTestId("checkout-return-progress")
    const warning = page.getByTestId("checkout-return-warning")
    const liveStatus = page.getByTestId("checkout-return-live-status")

    await expect(progress).toBeVisible()

    if (await warning.count()) {
      await expect(warning).toBeVisible()
    }

    if (await liveStatus.count()) {
      await expect(liveStatus).toContainText(/REDIRECTED/i)
    }
  })

  test("redirects to order confirmation after backend-confirmed payment arrives", async ({
    page,
  }) => {
    const paymentId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    const orderId = "11111111-2222-3333-4444-555555555555"

    await setStoredCheckoutPaymentId(page, paymentId)

    await page.route(`**/api/bff/sse/checkout-payments/${paymentId}`, async (route) => {
      await route.abort()
    })

    await page.route(`**/api/bff/payments/${paymentId}/confirmation`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          paymentId,
          provider: "stripe",
          paymentStatus: "SUCCEEDED",
          isConfirmed: true,
          orderId,
          orderNumber: "MK-20260321-B13F2C",
          orderStatus: "READY_TO_FULFILL",
          orderTotalCents: 21900,
          orderCurrencyCode: "USD",
          guestEmail: "popopopopopop@awsed.com",
        }),
      })
    })

    await page.route(`**/api/bff/orders/${orderId}*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: orderId,
          orderNumber: "MK-20260321-B13F2C",
          status: "READY_TO_FULFILL",
          totalCents: 21900,
          currencyCode: "USD",
          paymentStatus: "SUCCEEDED",
          provider: "stripe",
          guestEmail: "popopopopopop@awsed.com",
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

    await page.route(`**/api/bff/sse/orders/${orderId}`, async (route) => {
      await route.abort()
    })

    await page.goto("/checkout/return", { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("checkout-return-page")).toBeVisible()

    await page.waitForFunction(
      ({ expectedOrderId, expectedPaymentId }) => {
        const url = new URL(window.location.href)
        return (
          url.pathname === "/order-confirmation" &&
          url.searchParams.get("orderId") === expectedOrderId &&
          url.searchParams.get("paymentId") === expectedPaymentId
        )
      },
      { expectedOrderId: orderId, expectedPaymentId: paymentId },
    )

    await expect(page.getByTestId("order-confirmation-page")).toBeVisible()
    await expect(page.getByTestId("order-confirmation-card")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /your order status is backend-confirmed/i }),
    ).toBeVisible()
    await expect(page.getByTestId("order-confirmation-payment-status")).toContainText("Paid")
    await expect(page.getByTestId("order-confirmation-provider")).toContainText(/stripe/i)
    await expect(page.getByTestId("order-confirmation-total")).toContainText("$219.00")
  })
})