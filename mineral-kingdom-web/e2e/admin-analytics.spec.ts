import { test, expect, type Page, type Response, type Download } from "@playwright/test"

test.describe.configure({ mode: "serial" })

const hasAdminFixture = !!process.env.E2E_ADMIN_EMAIL && !!process.env.E2E_ADMIN_PASSWORD

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")
test.skip(!hasAdminFixture, "Requires OWNER fixture (set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD).")

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

  await expect(page).toHaveURL(/\/account|\/admin/, { timeout: 15_000 })
}

async function loginAsAdmin(page: Page) {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-analytics-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!)
}

test.describe("admin analytics", () => {
  test("analytics page renders KPI cards and charts", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto("/admin/analytics", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-analytics-page")).toBeVisible()

    await expect(page.getByTestId("admin-analytics-kpi-gross-sales")).toBeVisible()
    await expect(page.getByTestId("admin-analytics-kpi-orders")).toBeVisible()
    await expect(page.getByTestId("admin-analytics-kpi-aov")).toBeVisible()
    await expect(page.getByTestId("admin-analytics-kpi-auctions-sold")).toBeVisible()
    await expect(page.getByTestId("admin-analytics-kpi-sell-through")).toBeVisible()

    await expect(page.getByTestId("admin-analytics-sales-chart")).toBeVisible()
    await expect(page.getByTestId("admin-analytics-auctions-chart")).toBeVisible()
    await expect(page.getByTestId("admin-analytics-operations")).toBeVisible()
  })

  test("analytics page shows export and print actions", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto("/admin/analytics", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-analytics-page")).toBeVisible()

    await expect(page.getByTestId("admin-analytics-export-csv")).toBeVisible()
    await expect(page.getByTestId("admin-analytics-print")).toBeVisible()
  })

  test("csv export downloads a file", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto("/admin/analytics", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-analytics-page")).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("admin-analytics-export-csv").click(),
    ])

    const suggestedFilename = download.suggestedFilename()
    expect(suggestedFilename).toMatch(/^analytics-report-.*\.csv$/)
  })
})