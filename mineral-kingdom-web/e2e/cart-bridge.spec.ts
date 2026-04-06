import { test, expect } from "@playwright/test"

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")

test.describe.configure({ mode: "serial" })

const FRONTEND_ORIGIN = "http://127.0.0.1:3005"
const BACKEND_ORIGIN = "http://127.0.0.1:8080"
const COOKIE_DOMAIN = "127.0.0.1"
const RAINBOW_OFFER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3"

async function reseedBackend(request: import("@playwright/test").APIRequestContext) {
  const response = await request.post(`${BACKEND_ORIGIN}/api/testing/e2e/seed`)
  expect(response.ok()).toBeTruthy()
}

async function seedCartLineViaBff(
  page: import("@playwright/test").Page,
  offerId: string,
) {
  const bootstrap = await page.request.get(`${FRONTEND_ORIGIN}/api/bff/cart`)
  expect(bootstrap.ok()).toBeTruthy()

  const setCookieHeader = bootstrap.headers()["set-cookie"]
  const match = setCookieHeader?.match(/mk_cart_id=([^;]+)/)
  expect(match?.[1]).toBeTruthy()

  const cartId = match![1]

  await page.context().addCookies([
    {
      name: "mk_cart_id",
      value: cartId,
      domain: COOKIE_DOMAIN,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ])

  const addLineRes = await page.request.put(`${FRONTEND_ORIGIN}/api/bff/cart`, {
    headers: {
      cookie: `mk_cart_id=${cartId}`,
      "content-type": "application/json",
    },
    data: {
      offerId,
      quantity: 1,
    },
  })

  expect(addLineRes.ok()).toBeTruthy()

  return { cartId }
}

test.beforeEach(async ({ request, page, context }) => {
  await context.clearCookies()
  await page.goto("/", { waitUntil: "domcontentloaded" })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await reseedBackend(request)
})

test("guest add to cart persists across refresh and shows warning", async ({ page }) => {
  await seedCartLineViaBff(page, RAINBOW_OFFER_ID)

  await page.goto("/cart", { waitUntil: "domcontentloaded" })

  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByTestId("cart-page")).toBeVisible()
  await expect(page.getByTestId("cart-warning-banner")).toBeVisible()
  await expect(page.getByTestId("cart-line")).toHaveCount(1, { timeout: 15_000 })

  await page.reload()

  await expect(page.getByTestId("cart-page")).toBeVisible()
  await expect(page.getByTestId("cart-warning-banner")).toBeVisible()
  await expect(page.getByTestId("cart-line")).toHaveCount(1, { timeout: 15_000 })
})

test("guest can remove a cart line", async ({ page }) => {
  await seedCartLineViaBff(page, RAINBOW_OFFER_ID)

  await page.goto("/cart", { waitUntil: "domcontentloaded" })

  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByTestId("cart-line")).toHaveCount(1, { timeout: 15_000 })

  await page.getByTestId("cart-remove-button").first().click()

  await expect(page.getByTestId("cart-line")).toHaveCount(0, { timeout: 15_000 })
  await expect(page.getByTestId("cart-empty-state")).toBeVisible()
})

test("empty cart page renders cleanly", async ({ page }) => {
  await page.goto("/cart", { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("cart-page")).toBeVisible()

  const lineCount = await page.getByTestId("cart-line").count()
  if (lineCount === 0) {
    await expect(page.getByTestId("cart-empty-state")).toBeVisible()
  }
})