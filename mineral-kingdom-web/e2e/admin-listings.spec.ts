import { test, expect, type Page, type Response } from "@playwright/test"
import { waitForAuthenticatedSession } from "./helpers/session"

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

  await waitForAuthenticatedSession(page, email)
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

  const detailResp = await page
    .waitForResponse(
      (resp: Response) =>
        resp.url().includes(`/api/bff/admin/listings/${listingId}`) &&
        resp.request().method() === "GET",
      { timeout: 15_000 },
    )
    .catch(() => null)

  if (detailResp && !detailResp.ok()) {
    const status = detailResp.status()
    const bodyText = await detailResp.text().catch(() => "<unable to read body>")
    throw new Error(`Load listing detail failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  const loading = page.getByTestId("admin-listing-editor-loading")
  const title = page.getByTestId("admin-listing-title")
  const save = page.getByTestId("admin-listing-save")

  if (await loading.isVisible().catch(() => false)) {
    await expect(loading).toBeHidden({ timeout: 15_000 })
  }

  await expect(page.getByTestId("admin-listing-editor-page")).toBeVisible({ timeout: 15_000 })
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
  await expect(notice).toContainText(/core\s+inventory\/specimen record/i)
  await expect(notice).toContainText(/store offer/i)
  await expect(notice).toContainText(/auction/i)
  await expect(notice).toContainText(/commerce state/i)
  await expect(notice).toContainText(/available/i)
  await expect(notice).toContainText(/sold/i)

  await expect(page.getByTestId("admin-create-draft-listing")).toBeVisible()

  const table = page.getByTestId("admin-listings-table")
  await expect(table).toBeVisible({ timeout: 15_000 })
  await expect(table).toContainText(/commerce state/i)
  await expect(table).toContainText(/available|store offer|auction|sold|unavailable/i)
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

test("admin can search and select a mineral for a listing when lookup results are available", async ({
  page,
}) => {
  await loginAsAdmin(page)
  await createDraftAndOpenEditor(page)

  const search = page.getByTestId("admin-listing-mineral-search")
  await search.fill("flu")
  await expect(search).toHaveValue("flu")

  await page.waitForTimeout(1000)

  const results = page.getByTestId("admin-listing-mineral-results")
  const resultCount = await results.count()

  if (resultCount === 0) {
    await expect(page.getByText(/selected mineral id:/i)).toContainText("—")
    return
  }

  await expect(results).toBeVisible({ timeout: 15_000 })

  const options = results.locator("button")
  const optionCount = await options.count()

  if (optionCount === 0) {
    await expect(page.getByText(/selected mineral id:/i)).toContainText("—")
    return
  }

  await options.first().click()
  await expect(page.getByText(/selected mineral id:/i)).not.toContainText("—")
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

  // COUNTRY, LENGTH_CM, WIDTH_CM, HEIGHT_CM are optional — not in the publish checklist
  await expect(page.getByTestId("admin-listing-checklist-COUNTRY")).not.toBeAttached()
  await expect(page.getByTestId("admin-listing-checklist-LENGTH_CM")).not.toBeAttached()
  await expect(page.getByTestId("admin-listing-checklist-WIDTH_CM")).not.toBeAttached()
  await expect(page.getByTestId("admin-listing-checklist-HEIGHT_CM")).not.toBeAttached()

  await expect(page.getByText(/checklist updates as you edit/i)).toBeVisible()
  await expect(page.getByText(/save changes to refresh the publish button/i)).toBeVisible()
  await expect(page.getByTestId("admin-listing-publish")).toBeDisabled()
})

test("media section renders for active drafts", async ({ page }) => {
  await loginAsAdmin(page)
  await createDraftAndOpenEditor(page)

  await expect(page.getByTestId("admin-listing-media-section")).toBeVisible()
  await expect(page.getByTestId("admin-listing-media-title")).toBeVisible()
  await expect(page.getByTestId("admin-listing-media-description")).toBeVisible()
  await expect(page.getByTestId("admin-listing-media-file-input")).toBeAttached()
  await expect(page.getByTestId("admin-listing-media-open-picker")).toBeVisible()
  await expect(page.getByText(/supported formats:/i)).toBeVisible()
  await expect(page.getByText(/max file size:/i)).toBeVisible()
  await expect(page.getByText(/no media yet/i)).toBeVisible()
  await expect(page.getByTestId("admin-listing-media-empty-upload")).toBeVisible()
})

test("admin form shows optional specimen details section containing all relocated fields", async ({
  page,
}) => {
  await loginAsAdmin(page)
  await createDraftAndOpenEditor(page)

  // The new "Optional specimen details" section heading must be present
  await expect(page.getByRole("heading", { name: /optional specimen details/i })).toBeVisible()

  // All relocated optional fields must be accessible within the section
  await expect(page.getByTestId("admin-listing-country-code")).toBeVisible()
  await expect(page.getByTestId("admin-listing-length-cm")).toBeVisible()
  await expect(page.getByTestId("admin-listing-width-cm")).toBeVisible()
  await expect(page.getByTestId("admin-listing-height-cm")).toBeVisible()
  await expect(page.getByTestId("admin-listing-weight-grams")).toBeVisible()
  await expect(page.getByTestId("admin-listing-mine-name")).toBeVisible()
  await expect(page.getByTestId("admin-listing-fluorescence-notes")).toBeVisible()
  await expect(page.getByTestId("admin-listing-condition-notes")).toBeVisible()
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
  await expect(page.getByTestId("admin-listing-media-file-input")).toBeDisabled()
})

test("admin can save a listing with only core required fields and no optional specimen details", async ({
  page,
}) => {
  await loginAsAdmin(page)
  await createDraftAndOpenEditor(page)

  // Fill only core fields — no country code, dimensions, weight, mine name, or condition notes
  await page.getByTestId("admin-listing-title").fill("Minimal Core Fields Listing")
  await page.getByTestId("admin-listing-description").fill("Testing that optional specimen details are not required.")
  await page.getByTestId("admin-listing-locality-display").fill("Unknown locality")
  await page.getByTestId("admin-listing-quantity-total").fill("1")
  await page.getByTestId("admin-listing-quantity-available").fill("1")

  // Confirm optional fields are empty
  await expect(page.getByTestId("admin-listing-country-code")).toHaveValue("")
  await expect(page.getByTestId("admin-listing-length-cm")).toHaveValue("")
  await expect(page.getByTestId("admin-listing-weight-grams")).toHaveValue("")

  await expect(page.getByTestId("admin-listing-unsaved")).toBeVisible()
  await page.getByTestId("admin-listing-save").click()

  await expect(page.getByTestId("admin-listing-action-success")).toContainText(/listing saved/i, {
    timeout: 15_000,
  })

  // Reload to confirm save persisted without optional fields blocking it
  await page.reload()
  await expect(page.getByTestId("admin-listing-title")).toHaveValue("Minimal Core Fields Listing")
  await expect(page.getByTestId("admin-listing-country-code")).toHaveValue("")
  await expect(page.getByTestId("admin-listing-length-cm")).toHaveValue("")
})
