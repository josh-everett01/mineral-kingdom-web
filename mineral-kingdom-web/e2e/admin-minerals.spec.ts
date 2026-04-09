import { test, expect, type Page, type Response } from "@playwright/test"

test.describe.configure({ mode: "serial" })

const hasAdminFixture = !!process.env.E2E_ADMIN_EMAIL && !!process.env.E2E_ADMIN_PASSWORD

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")
test.skip(
  !hasAdminFixture,
  "Requires seeded admin fixture (set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD).",
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
    "X-Test-RateLimit-Key": `admin-minerals-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!)
}

test("admin can open minerals page and search minerals", async ({ page }) => {
  await loginAsAdmin(page)

  await page.goto("/admin/minerals")
  await expect(page).toHaveURL(/\/admin\/minerals/, { timeout: 15_000 })

  await expect(page.getByTestId("admin-minerals-page")).toBeVisible()
  await expect(page.getByTestId("admin-minerals-definition-notice")).toBeVisible()

  await page.getByTestId("admin-minerals-search").fill("flu")
  await expect(page.getByTestId("admin-minerals-list")).toBeVisible()
})

test("admin can create a mineral and find it in search", async ({ page }) => {
  await loginAsAdmin(page)

  const mineralName = `S16 Test Mineral ${Date.now()}`

  await page.goto("/admin/minerals")
  await expect(page.getByTestId("admin-minerals-page")).toBeVisible()

  await page.getByTestId("admin-mineral-name").fill(mineralName)
  await page.getByTestId("admin-create-mineral").click()

  await expect(page.getByTestId("admin-mineral-create-success")).toContainText(/created/i, {
    timeout: 15_000,
  })

  await page.getByTestId("admin-minerals-search").fill(mineralName)
  await expect(page.getByTestId("admin-minerals-list")).toContainText(mineralName, {
    timeout: 15_000,
  })
})

test("duplicate mineral create shows validation", async ({ page }) => {
  await loginAsAdmin(page)

  const mineralName = `S16 Duplicate ${Date.now()}`

  await page.goto("/admin/minerals")
  await expect(page.getByTestId("admin-minerals-page")).toBeVisible()

  await page.getByTestId("admin-mineral-name").fill(mineralName)
  await page.getByTestId("admin-create-mineral").click()

  await expect(page.getByTestId("admin-mineral-create-success")).toBeVisible({
    timeout: 15_000,
  })

  await page.getByTestId("admin-mineral-name").fill(mineralName)
  await page.getByTestId("admin-create-mineral").click()

  await expect(page.getByTestId("admin-mineral-create-error")).toContainText(/already exists/i, {
    timeout: 15_000,
  })
})