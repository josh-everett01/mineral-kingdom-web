import { test, expect, type Page } from "@playwright/test"

const hasBackend = !!process.env.E2E_BACKEND
const APP_ORIGIN = "http://127.0.0.1:3005"
const BACKEND_ORIGIN = "http://127.0.0.1:8080"

const AMETHYST_OFFER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6"

async function reseedBackend(request: import("@playwright/test").APIRequestContext) {
  const response = await request.post(`${BACKEND_ORIGIN}/api/testing/e2e/seed`)
  expect(response.ok()).toBeTruthy()
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
    data: { offerId, quantity: 1 },
  })
  expect(addRes.ok()).toBeTruthy()

  const startRes = await page.request.post(`${APP_ORIGIN}/api/bff/checkout/start`, {
    headers: {
      cookie: `mk_cart_id=${cartId}`,
      "content-type": "application/json",
    },
    data: { cartId, email },
  })
  expect(startRes.ok()).toBeTruthy()

  const body = (await startRes.json()) as { cartId: string; holdId: string; expiresAt: string }
  expect(body.holdId).toBeTruthy()

  return body
}

async function fillShippingAddress(page: Page) {
  await page.getByTestId("ship-full-name").fill("Jane Buyer")
  await page.getByTestId("ship-address-line1").fill("123 Main St")
  await page.getByTestId("ship-city").fill("Tucson")
  await page.getByTestId("ship-state").fill("AZ")
  await page.getByTestId("ship-postal").fill("85701")
  await page.getByTestId("ship-country").selectOption("US")
}

// ── mock helpers ────────────────────────────────────────────────────────────

function mockShippingAddressSave(
  page: Page,
  holdId: string,
  status = 200,
) {
  return page.route("**/api/bff/checkout/shipping-address", async (route) => {
    if (status !== 200) {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ error: "HOLD_NOT_FOUND" }),
      })
      return
    }

    const reqBody = route.request().postDataJSON() as Record<string, unknown>

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        holdId,
        shippingAddress: {
          fullName: reqBody.fullName ?? "Jane Buyer",
          addressLine1: reqBody.addressLine1 ?? "123 Main St",
          addressLine2: reqBody.addressLine2 ?? null,
          city: reqBody.city ?? "Tucson",
          stateOrProvince: reqBody.stateOrProvince ?? "AZ",
          postalCode: reqBody.postalCode ?? "85701",
          countryCode: reqBody.countryCode ?? "US",
        },
      }),
    })
  })
}

// ── tests ────────────────────────────────────────────────────────────────────

test.describe("checkout shipping address (mocked)", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Stub active to simulate an active hold with no address yet
    await page.route("**/api/bff/checkout/active", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          active: true,
          cartId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          holdId: "ffffffff-0000-1111-2222-333333333333",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          guestEmail: "guest@example.com",
          status: "Active",
          canExtend: false,
          extensionCount: 0,
          maxExtensions: 2,
          shippingAddress: null,
        }),
      })
    })

    // Stub heartbeat
    await page.route("**/api/bff/checkout/heartbeat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          holdId: "ffffffff-0000-1111-2222-333333333333",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          canExtend: false,
          extensionCount: 0,
          maxExtensions: 2,
        }),
      })
    })

    // Stub preview-pricing
    await page.route("**/api/bff/checkout/preview-pricing", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          holdId: "ffffffff-0000-1111-2222-333333333333",
          subtotalCents: 4900,
          shippingAmountCents: 1200,
          totalCents: 6100,
          currencyCode: "USD",
          shippingMode: "SHIP_NOW",
          selectedRegionCode: "US",
        }),
      })
    })
  })

  test("shipping address form is visible before payment can proceed", async ({ page }) => {
    await page.goto(
      `/checkout/pay?holdId=ffffffff-0000-1111-2222-333333333333`,
      { waitUntil: "domcontentloaded" },
    )

    await expect(page.getByTestId("checkout-pay-page")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-shipping-address-section")).toBeVisible()
    await expect(page.getByTestId("shipping-address-form")).toBeVisible()

    // Payment button disabled until address saved
    const payBtn = page.getByTestId("checkout-pay-start")
    await expect(payBtn).toBeDisabled()
  })

  test("buyer can fill and save shipping address, then payment button enables", async ({
    page,
  }) => {
    await mockShippingAddressSave(page, "ffffffff-0000-1111-2222-333333333333")

    await page.goto(
      `/checkout/pay?holdId=ffffffff-0000-1111-2222-333333333333`,
      { waitUntil: "domcontentloaded" },
    )

    await expect(page.getByTestId("shipping-address-form")).toBeVisible()

    await fillShippingAddress(page)
    await page.getByTestId("ship-save-btn").click()

    // Form disappears after save
    await expect(page.getByTestId("shipping-address-form")).not.toBeVisible()

    // Summary line shown
    await expect(page.getByTestId("checkout-pay-address-summary")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-address-summary")).toContainText("Jane Buyer")
    await expect(page.getByTestId("checkout-pay-address-summary")).toContainText("Tucson")

    // Payment button now enabled
    const payBtn = page.getByTestId("checkout-pay-start")
    await expect(payBtn).toBeEnabled()
  })

  test("buyer can edit a saved shipping address", async ({ page }) => {
    await mockShippingAddressSave(page, "ffffffff-0000-1111-2222-333333333333")

    await page.goto(
      `/checkout/pay?holdId=ffffffff-0000-1111-2222-333333333333`,
      { waitUntil: "domcontentloaded" },
    )

    await fillShippingAddress(page)
    await page.getByTestId("ship-save-btn").click()

    await expect(page.getByTestId("checkout-pay-address-summary")).toBeVisible()

    // Click Edit
    await page.getByTestId("checkout-pay-edit-address").click()

    // Form re-appears prefilled
    await expect(page.getByTestId("shipping-address-form")).toBeVisible()
    await expect(page.getByTestId("ship-full-name")).toHaveValue("Jane Buyer")

    // Payment button disabled again until re-saved
    await expect(page.getByTestId("checkout-pay-start")).toBeDisabled()
  })

  test("validation errors shown when required fields are empty", async ({ page }) => {
    await page.goto(
      `/checkout/pay?holdId=ffffffff-0000-1111-2222-333333333333`,
      { waitUntil: "domcontentloaded" },
    )

    await expect(page.getByTestId("shipping-address-form")).toBeVisible()

    // Submit without filling anything
    await page.getByTestId("ship-save-btn").click()

    await expect(page.getByTestId("ship-full-name-error")).toBeVisible()
    await expect(page.getByTestId("ship-address-line1-error")).toBeVisible()
    await expect(page.getByTestId("ship-city-error")).toBeVisible()
    await expect(page.getByTestId("ship-state-error")).toBeVisible()
    await expect(page.getByTestId("ship-postal-error")).toBeVisible()

    // Payment button still disabled
    await expect(page.getByTestId("checkout-pay-start")).toBeDisabled()
  })

  test("signed-in buyer sees prefilled address when active hold already has one", async ({
    page,
  }) => {
    // Override the active stub to include a pre-saved address
    await page.unroute("**/api/bff/checkout/active")
    await page.route("**/api/bff/checkout/active", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          active: true,
          cartId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          holdId: "ffffffff-0000-1111-2222-333333333333",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          guestEmail: null,
          status: "Active",
          canExtend: false,
          extensionCount: 0,
          maxExtensions: 2,
          shippingAddress: {
            fullName: "John Prefilled",
            addressLine1: "456 Elm Ave",
            addressLine2: null,
            city: "Phoenix",
            stateOrProvince: "AZ",
            postalCode: "85001",
            countryCode: "US",
          },
        }),
      })
    })

    await page.goto(
      `/checkout/pay?holdId=ffffffff-0000-1111-2222-333333333333`,
      { waitUntil: "domcontentloaded" },
    )

    // Address already saved — summary shown, form hidden
    await expect(page.getByTestId("checkout-pay-address-summary")).toBeVisible()
    await expect(page.getByTestId("checkout-pay-address-summary")).toContainText("John Prefilled")
    await expect(page.getByTestId("checkout-pay-address-summary")).toContainText("Phoenix")

    // Payment button enabled immediately
    await expect(page.getByTestId("checkout-pay-start")).toBeEnabled()
  })

  test("address line 2 is optional and not required for form submission", async ({ page }) => {
    await mockShippingAddressSave(page, "ffffffff-0000-1111-2222-333333333333")

    await page.goto(
      `/checkout/pay?holdId=ffffffff-0000-1111-2222-333333333333`,
      { waitUntil: "domcontentloaded" },
    )

    // Fill all required fields but leave address line 2 empty
    await page.getByTestId("ship-full-name").fill("Jane Buyer")
    await page.getByTestId("ship-address-line1").fill("123 Main St")
    // address-line2 intentionally left empty
    await page.getByTestId("ship-city").fill("Tucson")
    await page.getByTestId("ship-state").fill("AZ")
    await page.getByTestId("ship-postal").fill("85701")
    await page.getByTestId("ship-country").selectOption("US")

    await page.getByTestId("ship-save-btn").click()

    // Should succeed without errors
    await expect(page.getByTestId("shipping-address-form")).not.toBeVisible()
    await expect(page.getByTestId("checkout-pay-address-summary")).toBeVisible()
  })
})

// ── backend-required tests ───────────────────────────────────────────────────

test.describe("checkout shipping address (backend required)", () => {
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

  test("guest buyer can enter address and proceed to payment provider", async ({ page }) => {
    const checkout = await createGuestCheckoutHoldViaBff(
      page,
      AMETHYST_OFFER_ID,
      `guest-${Date.now()}@example.com`,
    )

    await page.goto(`/checkout/pay?holdId=${encodeURIComponent(checkout.holdId)}`, {
      waitUntil: "domcontentloaded",
    })

    await expect(page.getByTestId("checkout-pay-page")).toBeVisible()
    await expect(page.getByTestId("shipping-address-form")).toBeVisible()

    // Payment button disabled
    await expect(page.getByTestId("checkout-pay-start")).toBeDisabled()

    await fillShippingAddress(page)
    await page.getByTestId("ship-save-btn").click()

    // Address saved — summary shown
    await expect(page.getByTestId("checkout-pay-address-summary")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId("checkout-pay-address-summary")).toContainText("Jane Buyer")

    // Payment button now enabled
    await expect(page.getByTestId("checkout-pay-start")).toBeEnabled({ timeout: 5_000 })
  })

  test("address is persisted on hold and returned by active endpoint", async ({ page }) => {
    const checkout = await createGuestCheckoutHoldViaBff(
      page,
      AMETHYST_OFFER_ID,
      `guest-${Date.now()}@example.com`,
    )

    // Save address directly via BFF API
    const saveRes = await page.request.post(`${APP_ORIGIN}/api/bff/checkout/shipping-address`, {
      headers: { "content-type": "application/json" },
      data: {
        holdId: checkout.holdId,
        fullName: "Jane Buyer",
        addressLine1: "123 Main St",
        addressLine2: null,
        city: "Tucson",
        stateOrProvince: "AZ",
        postalCode: "85701",
        countryCode: "US",
      },
    })
    expect(saveRes.ok()).toBeTruthy()

    // Verify active endpoint returns the address
    const activeRes = await page.request.get(`${APP_ORIGIN}/api/bff/checkout/active`)
    expect(activeRes.ok()).toBeTruthy()

    const active = (await activeRes.json()) as {
      shippingAddress?: {
        fullName: string
        city: string
      } | null
    }

    expect(active.shippingAddress).toBeTruthy()
    expect(active.shippingAddress?.fullName).toBe("Jane Buyer")
    expect(active.shippingAddress?.city).toBe("Tucson")
  })
})
