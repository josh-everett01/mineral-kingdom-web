import { expect, test, type Page, type Response } from "@playwright/test"
import { waitForAuthenticatedSession } from "./helpers/session"

test.describe.configure({ mode: "serial" })

const hasAdminFixture =
  !!process.env.E2E_ADMIN_LISTINGS_EMAIL && !!process.env.E2E_ADMIN_LISTINGS_PASSWORD

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")
test.skip(
  !hasAdminFixture,
  "Requires seeded admin fixture (set E2E_ADMIN_LISTINGS_EMAIL and E2E_ADMIN_LISTINGS_PASSWORD).",
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

  await waitForAuthenticatedSession(page, email)
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

  await expect(page.getByTestId("admin-store-offer-form")).toContainText(
    /not already assigned to an auction, active sale offer, or sold order/i,
  )

  const results = page.getByTestId("admin-store-offer-listing-results")
  const exactOption = page.getByTestId(`admin-store-offer-listing-option-${listingId}`)
  const emptyState = page.getByTestId("admin-store-offer-listing-empty")

  await expect(exactOption.or(emptyState)).toBeVisible({ timeout: 15_000 })

  if (await emptyState.isVisible().catch(() => false)) {
    throw new Error(`Listing ${listingTitle} (${listingId}) is not eligible for store offer creation.`)
  }

  await expect(results).toBeVisible({ timeout: 15_000 })
  await expect(exactOption).toBeVisible({ timeout: 15_000 })
  await exactOption.click()

  await expect(page.getByText(/Selected listing id:/i)).toContainText(listingId)
}

function rowForListing(page: Page, listingTitle: string) {
  return page.getByTestId("admin-store-offers-row").filter({ hasText: listingTitle }).first()
}

async function getEligibleStoreOfferListing(page: Page, excludeIds: string[] = []) {
  const response = await page.request.get("/api/bff/admin/listings")
  expect(response.ok()).toBeTruthy()

  const listings = (await response.json()) as Array<{
    id: string
    title: string | null
    isEligibleForStoreOffer?: boolean
  }>

  return listings.find(
    (item) => item.isEligibleForStoreOffer === true && !excludeIds.includes(item.id),
  ) ?? null
}

test("admin can create a fixed-price store offer", async ({ page }) => {
  await loginAsAdmin(page)
  await gotoStoreOffers(page)

  const listing = await getEligibleStoreOfferListing(page)
  test.skip(!listing, "No eligible listing available for store offer creation.")

  const listingId = listing!.id
  const listingTitle = listing!.title ?? listingId

  await expect(page.getByTestId("admin-store-offer-definition-notice")).toContainText(
    /one active commerce path/i,
  )
  await expect(page.getByTestId("admin-store-offer-definition-notice")).toContainText(
    /not already assigned to an auction, active sale offer, or sold order/i,
  )

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
  await loginAsAdmin(page)
  await gotoStoreOffers(page)

  const listing = await getEligibleStoreOfferListing(page)
  test.skip(!listing, "No eligible listing available for discounted store offer creation.")

  const listingId = listing!.id
  const listingTitle = listing!.title ?? listingId

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
  await expect(row).toContainText(/percent(age)? discount/i)
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
