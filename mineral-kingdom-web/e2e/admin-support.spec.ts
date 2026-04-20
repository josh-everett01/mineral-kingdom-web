import { test, expect, type Page, type Response } from "@playwright/test"

test.describe.configure({ mode: "serial" })

const hasAdminFixture = !!process.env.E2E_ADMIN_EMAIL && !!process.env.E2E_ADMIN_PASSWORD

const TICKET_ID = process.env.E2E_ADMIN_SUPPORT_TICKET_ID ?? "11111111-1111-1111-1111-111111111111"
const TICKET_NUMBER = process.env.E2E_ADMIN_SUPPORT_TICKET_NUMBER ?? "MK-E2E-SUPPORT-1"
const TICKET_EMAIL = process.env.E2E_ADMIN_SUPPORT_TICKET_EMAIL ?? "support@example.com"
const FILTER_STATUS = process.env.E2E_ADMIN_SUPPORT_FILTER_STATUS ?? "OPEN"
const FILTER_PRIORITY = process.env.E2E_ADMIN_SUPPORT_FILTER_PRIORITY ?? "HIGH"

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

  await expect(page).toHaveURL(/\/account|\/admin/, { timeout: 15_000 })
}

async function loginAsAdmin(page: Page) {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-support-admin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!)
}

test.describe("admin support", () => {
  test("admin can filter tickets by status and priority", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto("/admin/support", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-support-page")).toBeVisible()

    await page.getByTestId("admin-support-filter-status").selectOption(FILTER_STATUS)
    await page.getByTestId("admin-support-filter-priority").selectOption(FILTER_PRIORITY)

    const rows = page.getByTestId("admin-support-row")
    await expect(rows.first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("admin-support-page")).toContainText(TICKET_NUMBER)
  })

  test("admin can open ticket detail", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto(`/admin/support/${TICKET_ID}`, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-support-detail-page")).toBeVisible()
    await expect(page.getByTestId("admin-support-detail-ticket-number")).toContainText(TICKET_NUMBER)
    await expect(page.getByTestId("admin-support-detail-page")).toContainText(TICKET_EMAIL)
  })

  test("admin can reply to ticket", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto(`/admin/support/${TICKET_ID}`, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-support-detail-page")).toBeVisible()

    const message = `Playwright reply ${Date.now()}`
    await page.getByTestId("admin-support-reply-message").fill(message)
    await page.getByTestId("admin-support-reply-submit").click()

    await expect(page.getByText(/reply sent/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("admin-support-detail-thread")).toContainText(message)
    await expect(page.getByTestId("admin-support-detail-status")).toContainText("WAITING_ON_CUSTOMER")
  })

  test("admin can close and reopen ticket", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto(`/admin/support/${TICKET_ID}`, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-support-detail-page")).toBeVisible()

    const closeButton = page.getByTestId("admin-support-close")
    const reopenButton = page.getByTestId("admin-support-reopen")
    const statusBadge = page.getByTestId("admin-support-detail-status")

    const currentStatus = (await statusBadge.textContent())?.trim() ?? ""

    if (currentStatus !== "CLOSED") {
      await expect(closeButton).toBeVisible({ timeout: 15_000 })
      await closeButton.click()
      await expect(page.getByText(/ticket closed/i)).toBeVisible({ timeout: 15_000 })
      await expect(statusBadge).toContainText("CLOSED", { timeout: 15_000 })
    }

    await expect(reopenButton).toBeVisible({ timeout: 15_000 })
    await reopenButton.click()

    await expect(page.getByText(/ticket reopened/i)).toBeVisible({ timeout: 15_000 })
    await expect(statusBadge).toContainText("OPEN", { timeout: 15_000 })
  })
})