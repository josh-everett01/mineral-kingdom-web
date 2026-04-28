import { expect, test, type Page, type Response } from "@playwright/test"

test.describe.configure({ mode: "serial" })

const hasAdminFixture =
  !!process.env.E2E_ADMIN_LISTINGS_EMAIL && !!process.env.E2E_ADMIN_LISTINGS_PASSWORD

const hasPublishedListingFixture =
  !!process.env.E2E_ADMIN_STORE_OFFERS_LISTING_ID &&
  !!process.env.E2E_ADMIN_STORE_OFFERS_LISTING_TITLE

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")
test.skip(
  !hasAdminFixture,
  "Requires seeded admin fixture (set E2E_ADMIN_LISTINGS_EMAIL and E2E_ADMIN_LISTINGS_PASSWORD).",
)
test.skip(
  !hasPublishedListingFixture,
  "Requires a published listing fixture (set E2E_ADMIN_STORE_OFFERS_LISTING_ID and E2E_ADMIN_STORE_OFFERS_LISTING_TITLE).",
)

async function login(page: Page, email: string, password: string) {
  await page.goto("/login")
  await expect(page.getByTestId("login-title")).toBeVisible()

  await page.getByTestId("login-email").fill(email)
  await page.getByTestId("login-password").fill(password)

  const [loginResp] = await Promise.all([
    page.waitForResponse((resp: Response) => {
      return resp.url().includes("/api/bff/auth/login") && resp.request().method() === "POST"
    }),
    page.getByTestId("login-submit").click(),
  ])

  if (!loginResp.ok()) {
    const status = loginResp.status()
    const bodyText = await loginResp.text().catch(() => "<unable to read body>")
    throw new Error(`Login failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  await expect(page).toHaveURL(/\/account|\/dashboard/, { timeout: 15_000 })
}

async function loginAsAdmin(page: Page) {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-store-offers-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(
    page,
    process.env.E2E_ADMIN_LISTINGS_EMAIL!,
    process.env.E2E_ADMIN_LISTINGS_PASSWORD!,
  )
}

async function gotoStoreOffers(page: Page) {
  await page.goto("/admin/store/offers")
  await expect(page).toHaveURL(/\/admin\/store\/offers/, { timeout: 15_000 })
  await expect(page.getByTestId("admin-store-offers-page")).toBeVisible({ timeout: 15_000 })
}

async function searchAndSelectListing(page: Page, listingId: string, listingTitle: string) {
  const search = page.getByTestId("admin-store-offer-listing-search")
  await expect(search).toBeVisible({ timeout: 15_000 })

  await search.fill(listingTitle)

  const results = page.getByTestId("admin-store-offer-listing-results")
  await expect(results).toBeVisible({ timeout: 15_000 })

  const exactOption = page.getByTestId(`admin-store-offer-listing-option-${listingId}`)
  await expect(exactOption).toBeVisible({ timeout: 15_000 })
  await exactOption.click()

  await expect(page.getByText(/Selected listing id:/i)).toContainText(listingId)
}

function rowForListing(page: Page, listingTitle: string) {
  return page.getByTestId("admin-store-offers-row").filter({ hasText: listingTitle }).first()
}

test("admin can create a fixed-price store offer", async ({ page }) => {
  const listingId = process.env.E2E_ADMIN_STORE_OFFERS_LISTING_ID!
  const listingTitle = process.env.E2E_ADMIN_STORE_OFFERS_LISTING_TITLE!

  await loginAsAdmin(page)
  await gotoStoreOffers(page)
  await searchAndSelectListing(page, listingId, listingTitle)

  await page.getByTestId("admin-store-offer-pricing-mode").selectOption("FIXED")
  await page.getByTestId("admin-store-offer-price").fill("150.00")
  await expect(page.getByTestId("admin-store-offer-preview")).toContainText("$150.00")

  const [saveResp] = await Promise.all([
    page.waitForResponse((resp: Response) => {
      return resp.url().includes("/api/bff/admin/store/offers") && resp.request().method() === "POST"
    }),
    page.getByTestId("admin-store-offer-save").click(),
  ])

  if (!saveResp.ok()) {
    const status = saveResp.status()
    const bodyText = await saveResp.text().catch(() => "<unable to read body>")
    throw new Error(`Create store offer failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  const row = rowForListing(page, listingTitle)
  await expect(row).toBeVisible({ timeout: 15_000 })
  await expect(row).toContainText("$150.00")
  await expect(row).toContainText("Fixed")
})

test("admin can create a discounted store offer and preview updates correctly", async ({ page }) => {
  const listingId = process.env.E2E_ADMIN_STORE_OFFERS_LISTING_ID!
  const listingTitle = process.env.E2E_ADMIN_STORE_OFFERS_LISTING_TITLE!

  await loginAsAdmin(page)
  await gotoStoreOffers(page)
  await searchAndSelectListing(page, listingId, listingTitle)

  await page.getByTestId("admin-store-offer-price").fill("150.00")

  await page.getByTestId("admin-store-offer-pricing-mode").selectOption("ABSOLUTE_DISCOUNT")
  await page.getByTestId("admin-store-offer-discount-amount").fill("10.00")
  await expect(page.getByTestId("admin-store-offer-preview")).toContainText("$140.00")

  await page.getByTestId("admin-store-offer-pricing-mode").selectOption("PERCENTAGE_DISCOUNT")
  await page.getByTestId("admin-store-offer-discount-percent").fill("25")
  await expect(page.getByTestId("admin-store-offer-preview")).toContainText("$112.50")

  const [saveResp] = await Promise.all([
    page.waitForResponse((resp: Response) => {
      return resp.url().includes("/api/bff/admin/store/offers") && resp.request().method() === "POST"
    }),
    page.getByTestId("admin-store-offer-save").click(),
  ])

  if (!saveResp.ok()) {
    const status = saveResp.status()
    const bodyText = await saveResp.text().catch(() => "<unable to read body>")
    throw new Error(`Create discounted store offer failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  const row = rowForListing(page, listingTitle)
  await expect(row).toBeVisible({ timeout: 15_000 })
  await expect(row).toContainText("$150.00")
  await expect(row).toContainText("$112.50")
  await expect(row).toContainText("Percentage discount")
})

test("admin can deactivate and reactivate an offer", async ({ page }) => {
  const listingTitle = process.env.E2E_ADMIN_STORE_OFFERS_LISTING_TITLE!

  await loginAsAdmin(page)
  await gotoStoreOffers(page)

  const row = rowForListing(page, listingTitle)
  await expect(row).toBeVisible({ timeout: 15_000 })

  const currentText = (await row.textContent()) ?? ""

  if (currentText.includes("INACTIVE")) {
    const activateButton = row.getByRole("button", { name: /activate/i })
    const [activateResp] = await Promise.all([
      page.waitForResponse((resp: Response) => {
        return /\/api\/bff\/admin\/store\/offers\/[0-9a-fA-F-]{36}$/.test(resp.url()) &&
          resp.request().method() === "PATCH"
      }),
      activateButton.click(),
    ])

    if (!activateResp.ok()) {
      const status = activateResp.status()
      const bodyText = await activateResp.text().catch(() => "<unable to read body>")
      throw new Error(`Pre-activate store offer failed: HTTP ${status}\nBody:\n${bodyText}`)
    }

    await expect(row).toContainText("ACTIVE")
  }

  const deactivateButton = row.getByRole("button", { name: /deactivate/i })
  const [deactivateResp] = await Promise.all([
    page.waitForResponse((resp: Response) => {
      return /\/api\/bff\/admin\/store\/offers\/[0-9a-fA-F-]{36}$/.test(resp.url()) &&
        resp.request().method() === "PATCH"
    }),
    deactivateButton.click(),
  ])

  if (!deactivateResp.ok()) {
    const status = deactivateResp.status()
    const bodyText = await deactivateResp.text().catch(() => "<unable to read body>")
    throw new Error(`Deactivate store offer failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  await expect(row).toContainText("INACTIVE")

  const activateButton = row.getByRole("button", { name: /activate/i })
  const [activateResp] = await Promise.all([
    page.waitForResponse((resp: Response) => {
      return /\/api\/bff\/admin\/store\/offers\/[0-9a-fA-F-]{36}$/.test(resp.url()) &&
        resp.request().method() === "PATCH"
    }),
    activateButton.click(),
  ])

  if (!activateResp.ok()) {
    const status = activateResp.status()
    const bodyText = await activateResp.text().catch(() => "<unable to read body>")
    throw new Error(`Activate store offer failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  await expect(row).toContainText("ACTIVE")
})