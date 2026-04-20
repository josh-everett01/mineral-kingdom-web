import { expect, test, type APIRequestContext, type Page, type Response } from "@playwright/test"

test.describe.configure({ mode: "serial" })

const hasAdminFixture =
  !!process.env.E2E_ADMIN_LISTINGS_EMAIL && !!process.env.E2E_ADMIN_LISTINGS_PASSWORD

const hasDraftFixture =
  !!process.env.E2E_ADMIN_AUCTIONS_DRAFT_LISTING_ID &&
  !!process.env.E2E_ADMIN_AUCTIONS_DRAFT_LISTING_TITLE

const hasScheduledFixture =
  !!process.env.E2E_ADMIN_AUCTIONS_SCHEDULED_LISTING_ID &&
  !!process.env.E2E_ADMIN_AUCTIONS_SCHEDULED_LISTING_TITLE

const hasLiveFixture =
  !!process.env.E2E_ADMIN_AUCTIONS_LIVE_LISTING_ID &&
  !!process.env.E2E_ADMIN_AUCTIONS_LIVE_LISTING_TITLE

const BACKEND_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8080"

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")
test.skip(
  !hasAdminFixture,
  "Requires seeded admin fixture (set E2E_ADMIN_LISTINGS_EMAIL and E2E_ADMIN_LISTINGS_PASSWORD).",
)

async function reseedCatalog(request: APIRequestContext) {
  const response = await request.post(`${BACKEND_BASE_URL}/api/testing/e2e/seed`, {
    headers: {
      "content-type": "application/json",
    },
  })

  expect(response.ok()).toBeTruthy()
}

function formatLocalDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0")

  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

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

  await expect(page).toHaveURL(/\/account/, { timeout: 15_000 })
}

async function loginAsAdmin(page: Page) {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-auctions-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(
    page,
    process.env.E2E_ADMIN_LISTINGS_EMAIL!,
    process.env.E2E_ADMIN_LISTINGS_PASSWORD!,
  )
}

async function gotoAdminAuctions(page: Page) {
  await page.goto("/admin/auctions")
  await expect(page).toHaveURL(/\/admin\/auctions/, { timeout: 15_000 })
  await expect(page.getByTestId("admin-auctions-page")).toBeVisible({ timeout: 15_000 })
}

async function searchAndSelectListing(page: Page, listingId: string, listingTitle: string) {
  const search = page.getByTestId("admin-auction-listing-search")
  await expect(search).toBeVisible({ timeout: 15_000 })

  await search.fill(listingTitle)

  const results = page.getByTestId("admin-auction-listing-results")
  await expect(results).toBeVisible({ timeout: 15_000 })

  const exactOption = page.getByTestId(`admin-auction-listing-option-${listingId}`)
  await expect(exactOption).toBeVisible({ timeout: 15_000 })
  await exactOption.click()

  await expect(page.getByText(/Selected listing id:/i)).toContainText(listingId)
}

test.skip(
  !hasDraftFixture,
  "Requires draft auction listing fixture (set E2E_ADMIN_AUCTIONS_DRAFT_LISTING_ID and E2E_ADMIN_AUCTIONS_DRAFT_LISTING_TITLE).",
)

test("admin can create an auction draft", async ({ page }) => {
  const listingId = process.env.E2E_ADMIN_AUCTIONS_DRAFT_LISTING_ID!
  const listingTitle = process.env.E2E_ADMIN_AUCTIONS_DRAFT_LISTING_TITLE!

  await reseedCatalog(page.request)
  await loginAsAdmin(page)
  await gotoAdminAuctions(page)
  await searchAndSelectListing(page, listingId, listingTitle)

  await page.getByRole("button", { name: /save as draft/i }).click()
  await page.getByRole("button", { name: "Manual" }).click()

  await expect(page.getByTestId("admin-auction-start-time")).toHaveCount(0)

  await page.getByTestId("admin-auction-close-time").fill("2026-04-23T18:00")
  await page.getByTestId("admin-auction-starting-price").fill("125.00")
  await page.getByTestId("admin-auction-reserve-price").fill("150.00")
  await page.getByTestId("admin-auction-quoted-shipping").fill("18.00")

  const [saveResp] = await Promise.all([
    page.waitForResponse((resp: Response) => {
      return resp.url().includes("/api/bff/admin/auctions") && resp.request().method() === "POST"
    }),
    page.getByTestId("admin-auction-save").click(),
  ])

  if (!saveResp.ok()) {
    const status = saveResp.status()
    const bodyText = await saveResp.text().catch(() => "<unable to read body>")
    throw new Error(`Create draft auction failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  await expect(page.getByText("Auction draft created.")).toBeVisible({ timeout: 15_000 })

  const draftSection = page.getByTestId("admin-auctions-draft-section")
  await expect(draftSection).toBeVisible()
  await expect(draftSection).toContainText(listingTitle)
  await expect(draftSection).toContainText("DRAFT")
})

test.skip(
  !hasScheduledFixture,
  "Requires scheduled auction listing fixture (set E2E_ADMIN_AUCTIONS_SCHEDULED_LISTING_ID and E2E_ADMIN_AUCTIONS_SCHEDULED_LISTING_TITLE).",
)

test("admin can schedule a future auction", async ({ page }) => {
  const listingId = process.env.E2E_ADMIN_AUCTIONS_SCHEDULED_LISTING_ID!
  const listingTitle = process.env.E2E_ADMIN_AUCTIONS_SCHEDULED_LISTING_TITLE!

  const scheduledStart = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const scheduledClose = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

  await reseedCatalog(page.request)
  await loginAsAdmin(page)
  await gotoAdminAuctions(page)
  await searchAndSelectListing(page, listingId, listingTitle)

  await page.getByRole("button", { name: /schedule for later/i }).click()
  await page.getByRole("button", { name: /preset duration/i }).click()

  await page.getByTestId("admin-auction-start-time").fill(formatLocalDateTimeInput(scheduledStart))
  await page.getByRole("button", { name: "3 days" }).click()

  // Re-apply close time explicitly in case UI presets are timing-sensitive in CI.
  await page.getByTestId("admin-auction-close-time").fill(formatLocalDateTimeInput(scheduledClose))

  await page.getByTestId("admin-auction-starting-price").fill("175.00")
  await page.getByTestId("admin-auction-reserve-price").fill("200.00")
  await page.getByTestId("admin-auction-quoted-shipping").fill("22.00")

  const [saveResp] = await Promise.all([
    page.waitForResponse((resp: Response) => {
      return resp.url().includes("/api/bff/admin/auctions") && resp.request().method() === "POST"
    }),
    page.getByTestId("admin-auction-save").click(),
  ])

  if (!saveResp.ok()) {
    const status = saveResp.status()
    const bodyText = await saveResp.text().catch(() => "<unable to read body>")
    throw new Error(`Schedule auction failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  await expect(page.getByText("Auction scheduled.")).toBeVisible({ timeout: 15_000 })

  const futureSection = page.getByTestId("admin-auctions-future-section")
  await expect(futureSection).toBeVisible()
  await expect(futureSection).toContainText(listingTitle)
  await expect(futureSection).toContainText("SCHEDULED")
})

test.skip(
  !hasLiveFixture,
  "Requires launch-now auction listing fixture (set E2E_ADMIN_AUCTIONS_LIVE_LISTING_ID and E2E_ADMIN_AUCTIONS_LIVE_LISTING_TITLE).",
)

test("admin can launch an auction now", async ({ page }) => {
  const listingId = process.env.E2E_ADMIN_AUCTIONS_LIVE_LISTING_ID!
  const listingTitle = process.env.E2E_ADMIN_AUCTIONS_LIVE_LISTING_TITLE!

  await reseedCatalog(page.request)
  await loginAsAdmin(page)
  await gotoAdminAuctions(page)
  await searchAndSelectListing(page, listingId, listingTitle)

  await page.getByRole("button", { name: /launch now/i }).click()
  await page.getByRole("button", { name: /preset duration/i }).click()
  await page.getByRole("button", { name: "24 hours" }).click()

  await page.getByTestId("admin-auction-starting-price").fill("225.00")
  await page.getByTestId("admin-auction-reserve-price").fill("250.00")
  await page.getByTestId("admin-auction-quoted-shipping").fill("25.00")

  const [saveResp] = await Promise.all([
    page.waitForResponse((resp: Response) => {
      return resp.url().includes("/api/bff/admin/auctions") && resp.request().method() === "POST"
    }),
    page.getByTestId("admin-auction-save").click(),
  ])

  if (!saveResp.ok()) {
    const status = saveResp.status()
    const bodyText = await saveResp.text().catch(() => "<unable to read body>")
    throw new Error(`Launch now auction failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  await expect(page.getByText("Auction launched.")).toBeVisible({ timeout: 15_000 })

  const liveSection = page.getByTestId("admin-auctions-live-section")
  await expect(liveSection).toBeVisible()
  await expect(liveSection).toContainText(listingTitle)
  await expect(liveSection).toContainText("LIVE")
})