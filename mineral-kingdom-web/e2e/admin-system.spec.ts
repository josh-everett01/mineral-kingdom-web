import { test, expect, type Page, type Response } from "@playwright/test"

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

  await expect(page).toHaveURL(/\/account|\/admin|\/dashboard/, { timeout: 15_000 })
}

async function loginAsAdmin(page: Page) {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-system-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!)
}

test.describe("admin system", () => {
  test("system page renders health sections", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto("/admin/system", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-system-page")).toBeVisible()

    await expect(page.getByTestId("admin-system-health-card")).toBeVisible()
    await expect(page.getByTestId("admin-system-db-card")).toBeVisible()
    await expect(page.getByTestId("admin-system-jobs-card")).toBeVisible()
    await expect(page.getByTestId("admin-system-webhooks-card")).toBeVisible()

    await expect(page.getByText(/application health/i)).toBeVisible()
    await expect(page.getByText(/database health/i)).toBeVisible()
    await expect(page.getByText(/jobs snapshot/i)).toBeVisible()
    await expect(page.getByText(/webhook \/ payment issues/i)).toBeVisible()
  })

  test("queue counts render", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto("/admin/system/queues", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-system-queues-page")).toBeVisible()

    await expect(page.getByTestId("admin-system-job-count-pending")).toBeVisible()
    await expect(page.getByTestId("admin-system-job-count-running")).toBeVisible()
    await expect(page.getByTestId("admin-system-job-count-dlq")).toBeVisible()
  })

  test("recent errors and webhook surfaces render where supported", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto("/admin/system/queues", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-system-queues-page")).toBeVisible()

    await expect(page.getByTestId("admin-system-recent-errors")).toBeVisible()
    await expect(page.getByTestId("admin-system-webhooks")).toBeVisible()

    await expect(page.getByRole("heading", { name: /recent job errors/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /webhook issue surfaces/i })).toBeVisible()
  })

  test("retry and requeue UI is hidden when backend support is absent", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto("/admin/system/queues", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-system-queues-page")).toBeVisible()

    await expect(page.getByTestId("admin-system-retry-job")).toHaveCount(0)
    await expect(page.getByTestId("admin-system-requeue-webhook")).toHaveCount(0)
  })
})