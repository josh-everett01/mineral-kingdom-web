import { test, expect, type Page, type Response } from "@playwright/test"

test.describe.configure({ mode: "serial" })

const hasAdminFixture =
  !!process.env.E2E_ADMIN_LISTINGS_EMAIL && !!process.env.E2E_ADMIN_LISTINGS_PASSWORD

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")
test.skip(
  !hasAdminFixture,
  "Requires seeded admin listings fixture (set E2E_ADMIN_LISTINGS_EMAIL and E2E_ADMIN_LISTINGS_PASSWORD).",
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

  await expect(page).toHaveURL(/\/account/, { timeout: 15_000 })
}

async function loginAsAdmin(page: Page) {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-listings-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(
    page,
    process.env.E2E_ADMIN_LISTINGS_EMAIL!,
    process.env.E2E_ADMIN_LISTINGS_PASSWORD!,
  )
}

async function createDraftAndOpenEditor(page: Page) {
  await page.goto("/admin/listings")
  await expect(page).toHaveURL(/\/admin\/listings/, { timeout: 15_000 })
  await expect(page.getByTestId("admin-listings-page")).toBeVisible()

  const [createResp] = await Promise.all([
    page.waitForResponse((resp: Response) => {
      return resp.url().includes("/api/bff/admin/listings") && resp.request().method() === "POST"
    }),
    page.getByTestId("admin-create-draft-listing").click(),
  ])

  if (!createResp.ok()) {
    const status = createResp.status()
    const bodyText = await createResp.text().catch(() => "<unable to read body>")
    throw new Error(`Create draft failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  await expect(page).toHaveURL(/\/admin\/listings\/[0-9a-fA-F-]{36}$/, { timeout: 15_000 })

  const currentUrl = page.url()
  const match = currentUrl.match(/\/admin\/listings\/([0-9a-fA-F-]{36})$/)
  if (!match) {
    throw new Error(`Expected listing detail URL, got: ${currentUrl}`)
  }

  const listingId = match[1]

  const detailResp = await page.waitForResponse(
    (resp: Response) =>
      resp.url().includes(`/api/bff/admin/listings/${listingId}`) &&
      resp.request().method() === "GET",
    { timeout: 15_000 },
  ).catch(() => null)

  if (detailResp && !detailResp.ok()) {
    const status = detailResp.status()
    const bodyText = await detailResp.text().catch(() => "<unable to read body>")
    throw new Error(`Load listing detail failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  const title = page.getByTestId("admin-listing-title")
  const save = page.getByTestId("admin-listing-save")

  if ((await title.count()) === 0) {
    const bodyText = await page.locator("body").innerText().catch(() => "<unable to read page body>")
    throw new Error(`Listing detail page loaded but editor controls were missing.\nURL: ${page.url()}\nBody snippet:\n${bodyText.slice(0, 2000)}`)
  }

  await expect(title).toBeVisible({ timeout: 15_000 })
  await expect(save).toBeVisible({ timeout: 15_000 })
}

test("admin listings page loads and explains listing vs store offer vs auction", async ({
  page,
}) => {
  await loginAsAdmin(page)

  await page.goto("/admin/listings")
  await expect(page).toHaveURL(/\/admin\/listings/, { timeout: 15_000 })

  await expect(page.getByTestId("admin-listings-page")).toBeVisible()
  await expect(page.getByTestId("admin-listing-definition-notice")).toBeVisible()

  const notice = page.getByTestId("admin-listing-definition-notice")
  await expect(notice.getByText(/listing is your core inventory record/i)).toBeVisible()
  await expect(notice.getByText("Store Offer", { exact: true })).toBeVisible()
  await expect(notice.getByText("Auction", { exact: true })).toBeVisible()

  await expect(page.getByTestId("admin-create-draft-listing")).toBeVisible()
})

test("admin can create a draft listing, edit fields, and save", async ({ page }) => {
  await loginAsAdmin(page)
  await createDraftAndOpenEditor(page)

  await expect(page.getByTestId("admin-listing-detail-status")).toContainText("DRAFT")

  await page.getByTestId("admin-listing-title").fill("S16 Test Fluorite")
  await page.getByTestId("admin-listing-description").fill("A frontend smoke-tested draft listing.")
  await page.getByTestId("admin-listing-locality-display").fill("Hunan, China")
  await page.getByTestId("admin-listing-country-code").fill("CN")
  await page.getByTestId("admin-listing-length-cm").fill("8.5")
  await page.getByTestId("admin-listing-width-cm").fill("2.4")
  await page.getByTestId("admin-listing-height-cm").fill("2.1")
  await page.getByTestId("admin-listing-weight-grams").fill("350")
  await page.getByTestId("admin-listing-quantity-total").fill("1")
  await page.getByTestId("admin-listing-quantity-available").fill("1")

  await expect(page.getByTestId("admin-listing-unsaved")).toBeVisible()

  await page.getByTestId("admin-listing-save").click()

  await expect(page.getByTestId("admin-listing-action-success")).toContainText(/listing saved/i, {
    timeout: 15_000,
  })

  await page.reload()

  await expect(page.getByTestId("admin-listing-title")).toHaveValue("S16 Test Fluorite")
  await expect(page.getByTestId("admin-listing-description")).toHaveValue(
    "A frontend smoke-tested draft listing.",
  )
  await expect(page.getByTestId("admin-listing-locality-display")).toHaveValue("Hunan, China")
  await expect(page.getByTestId("admin-listing-country-code")).toHaveValue("CN")
})

test("admin can search and select a mineral for a listing", async ({ page }) => {
  await loginAsAdmin(page)
  await createDraftAndOpenEditor(page)

  await page.getByTestId("admin-listing-mineral-search").fill("flu")

  const results = page.getByTestId("admin-listing-mineral-results")
  await expect(results).toBeVisible({ timeout: 15_000 })

  const options = results.locator("button")
  const optionCount = await options.count()

  if (optionCount > 0) {
    await options.first().click()
    await expect(page.getByText(/selected mineral id:/i)).not.toContainText("—")
  }
})

test("incomplete draft shows publish checklist guidance and publish remains unavailable", async ({
  page,
}) => {
  await loginAsAdmin(page)
  await createDraftAndOpenEditor(page)

  await expect(page.getByTestId("admin-listing-publish-checklist")).toBeVisible()
  await expect(page.getByTestId("admin-listing-checklist-TITLE")).toContainText(/missing|complete/i)
  await expect(page.getByTestId("admin-listing-checklist-DESCRIPTION")).toContainText(
    /missing|complete/i,
  )
  await expect(page.getByTestId("admin-listing-checklist-IMAGE_REQUIRED")).toContainText(
    /missing or invalid/i,
  )

  await expect(page.getByText(/last saved listing state/i)).toBeVisible()
  await expect(page.getByText(/need ready media before they can be published/i)).toBeVisible()
  await expect(page.getByTestId("admin-listing-publish")).toBeDisabled()
})

test("admin can archive a draft listing and archived listings become read-only", async ({
  page,
}) => {
  await loginAsAdmin(page)
  await createDraftAndOpenEditor(page)

  await page.getByTestId("admin-listing-title").fill("Archive candidate")
  await page.getByTestId("admin-listing-save").click()

  await expect(page.getByTestId("admin-listing-action-success")).toContainText(/listing saved/i, {
    timeout: 15_000,
  })

  await page.getByTestId("admin-listing-archive").click()

  await expect(page.getByTestId("admin-listing-action-success")).toContainText(
    /listing archived/i,
    {
      timeout: 15_000,
    },
  )
  await expect(page.getByTestId("admin-listing-detail-status")).toContainText("ARCHIVED")
  await expect(page.getByTestId("admin-listing-archived-note")).toBeVisible()
  await expect(page.getByTestId("admin-listing-title")).toBeDisabled()
  await expect(page.getByTestId("admin-listing-save")).toBeDisabled()
})