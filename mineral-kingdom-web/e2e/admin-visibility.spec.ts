import { test, expect, type Page, type Response } from "@playwright/test"

const hasStaffFixture = !!process.env.E2E_STAFF_EMAIL && !!process.env.E2E_STAFF_PASSWORD
const hasAdminFixture = !!process.env.E2E_ADMIN_EMAIL && !!process.env.E2E_ADMIN_PASSWORD

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")

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

test.skip(
  !hasStaffFixture,
  "Requires seeded staff fixture (set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD).",
)
test("STAFF sees admin shell and active shared navigation", async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-visibility-staff-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(page, process.env.E2E_STAFF_EMAIL!, process.env.E2E_STAFF_PASSWORD!)

  await page.goto("/admin/store/offers")
  await expect(page).toHaveURL(/\/admin\/store\/offers/, { timeout: 15_000 })

  await expect(page.getByTestId("admin-shell")).toBeVisible()
  await expect(page.getByTestId("admin-role-badge")).toContainText(/role:\s*staff/i)
  await expect(page.getByTestId("admin-nav-link-store-offers")).toHaveAttribute("data-active", "true")
  await expect(page.getByTestId("admin-nav-link-dashboard")).toHaveAttribute("data-active", "false")
  await expect(page.getByText("Store Offers")).toBeVisible()
})

test.skip(
  !hasAdminFixture,
  "Requires seeded admin fixture (set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD).",
)
test("OWNER sees admin shell and users navigation", async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-visibility-owner-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!)

  await page.goto("/admin/users")
  await expect(page).toHaveURL(/\/admin\/users/, { timeout: 15_000 })

  await expect(page.getByTestId("admin-shell")).toBeVisible()
  await expect(page.getByTestId("admin-role-badge")).toContainText(/role:\s*owner/i)
  await expect(page.getByTestId("admin-nav-link-users")).toHaveAttribute("data-active", "true")
  await expect(page.getByTestId("admin-nav-link-store-offers")).toBeVisible()
  await expect(page.getByText("Users")).toBeVisible()
})