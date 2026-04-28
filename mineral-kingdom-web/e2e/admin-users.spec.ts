import { test, expect, type Page, type Response } from "@playwright/test"

test.describe.configure({ mode: "serial" })

const hasOwnerFixture = !!process.env.E2E_ADMIN_EMAIL && !!process.env.E2E_ADMIN_PASSWORD
const hasStaffFixture = !!process.env.E2E_STAFF_EMAIL && !!process.env.E2E_STAFF_PASSWORD

const SEARCH_EMAIL = process.env.E2E_EMAIL ?? process.env.E2E_ADMIN_EMAIL ?? ""

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")
test.skip(!hasOwnerFixture, "Requires OWNER fixture (set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD).")
test.skip(!SEARCH_EMAIL, "Requires searchable seeded email (set E2E_EMAIL or E2E_ADMIN_EMAIL).")

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

  await expect(page).toHaveURL(/\/account|\/admin|\/dashboard/, { timeout: 15_000 })
}

async function loginAsOwner(page: Page) {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-users-owner-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!)
}

async function loginAsStaff(page: Page) {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-users-staff-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(page, process.env.E2E_STAFF_EMAIL!, process.env.E2E_STAFF_PASSWORD!)
}

async function waitForUsersPageReady(page: Page) {
  await expect(page.getByTestId("admin-users-page")).toBeVisible()
  const summary = page.getByText(/showing \d+ user/i).first()
  const emptyState = page.getByText(/no users found/i).first()

  await expect
    .poll(
      async () => {
        const summaryVisible = await summary.isVisible().catch(() => false)
        const emptyVisible = await emptyState.isVisible().catch(() => false)
        return summaryVisible || emptyVisible
      },
      { timeout: 15_000 },
    )
    .toBe(true)
}

async function searchForUser(page: Page, email: string) {
  await page.goto("/admin/users", { waitUntil: "domcontentloaded" })
  await waitForUsersPageReady(page)

  await page.getByTestId("admin-users-search").fill(email)
  await page.getByTestId("admin-users-search-submit").click()

  const matchingRows = page.getByTestId("admin-users-row").filter({ hasText: email })

  await expect.poll(
    async () => await matchingRows.count(),
    {
      timeout: 15_000,
      message: `Expected at least one admin user row containing ${email}`,
    },
  ).toBeGreaterThan(0)

  const matchingRow = matchingRows.first()
  await expect(matchingRow).toBeVisible()

  return matchingRow
}

async function openUserDetailFromRow(page: Page, row: ReturnType<Page["locator"]>) {
  await Promise.all([
    page.waitForURL(/\/admin\/users\/[^/]+$/, { timeout: 15_000 }),
    row.getByTestId("admin-users-open-link").click(),
  ])

  await page.waitForLoadState("domcontentloaded")
  await expect(page.getByTestId("admin-user-detail-page")).toBeVisible({ timeout: 15_000 })
}

test.describe("admin users", () => {
  test("owner can search user by email", async ({ page }) => {
    await loginAsOwner(page)
    await searchForUser(page, SEARCH_EMAIL)
  })

  test("owner can view user detail and sees role controls", async ({ page }) => {
    await loginAsOwner(page)
    const matchingRow = await searchForUser(page, SEARCH_EMAIL)

    await openUserDetailFromRow(page, matchingRow)

    await expect(page.getByTestId("admin-user-role")).toBeVisible()
    await expect(page.getByTestId("admin-user-role-controls")).toBeVisible()
    await expect(page.getByTestId("admin-user-role-select")).toBeVisible()
    await expect(page.getByTestId("admin-user-role-history")).toBeVisible()
  })

  test("staff can view user detail but does not see role change controls", async ({ page }) => {
    test.skip(!hasStaffFixture, "Requires STAFF fixture (set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD).")

    await loginAsStaff(page)
    const matchingRow = await searchForUser(page, SEARCH_EMAIL)

    await openUserDetailFromRow(page, matchingRow)

    await expect(page.getByTestId("admin-user-role")).toBeVisible()
    await expect(page.getByText(/only owner users can change roles/i)).toBeVisible()
    await expect(page.getByTestId("admin-user-role-controls")).toHaveCount(0)
  })

  test("owner sees governance warning around privileged changes", async ({ page }) => {
    await loginAsOwner(page)
    const matchingRow = await searchForUser(page, SEARCH_EMAIL)

    await openUserDetailFromRow(page, matchingRow)

    await expect(page.getByText(/granting staff provides access to admin operations/i)).toBeVisible()
    await expect(page.getByText(/owners cannot remove their own owner role/i)).toBeVisible()
    await expect(page.getByText(/the last owner cannot be removed/i)).toBeVisible()
  })
})
