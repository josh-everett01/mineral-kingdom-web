import { test, expect } from "@playwright/test"

const hasAdminFixture = !!process.env.E2E_ADMIN_EMAIL && !!process.env.E2E_ADMIN_PASSWORD

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")
test.skip(!hasAdminFixture, "Requires seeded admin fixture (set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD).")

test("STAFF/OWNER can access admin route", async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-allow-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  const email = process.env.E2E_ADMIN_EMAIL!
  const password = process.env.E2E_ADMIN_PASSWORD!

  await page.goto("/login")
  await expect(page.getByTestId("login-title")).toBeVisible()

  await page.getByTestId("login-email").fill(email)
  await page.getByTestId("login-password").fill(password)

  const [loginResp] = await Promise.all([
    page.waitForResponse((resp) => {
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
  await page.waitForLoadState("domcontentloaded")

  if (!page.url().includes("/admin")) {
    await page.goto("/admin", { waitUntil: "domcontentloaded" })
  }

  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })
  await expect(page.getByTestId("admin-shell")).toBeVisible()
  await expect(page.getByTestId("admin-topbar")).toBeVisible()
  await expect(page.getByTestId("admin-environment-badge")).toBeVisible()
  await expect(page.getByTestId("admin-role-badge")).toContainText(/role:\s*owner/i)
  await expect(page.getByText("Admin dashboard")).toBeVisible()
  await expect(page.getByTestId("admin-nav-link-store-offers")).toBeVisible()
})