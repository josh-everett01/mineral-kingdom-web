import { expect, test, type Page, type Response } from "@playwright/test"
import { waitForAuthenticatedSession } from "./helpers/session"

test.describe.configure({ mode: "serial" })

const hasAdminFixture =
  !!process.env.E2E_ADMIN_FULFILLMENT_EMAIL &&
  !!process.env.E2E_ADMIN_FULFILLMENT_PASSWORD

const hasRequestedFixture =
  !!process.env.E2E_ADMIN_FULFILLMENT_REQUESTED_GROUP_ID &&
  !!process.env.E2E_ADMIN_FULFILLMENT_REQUESTED_ORDER_NUMBER

const hasDirectFixture =
  !!process.env.E2E_ADMIN_FULFILLMENT_DIRECT_GROUP_ID &&
  !!process.env.E2E_ADMIN_FULFILLMENT_DIRECT_ORDER_NUMBER

console.log("admin fulfillment env", {
  E2E_BACKEND: process.env.E2E_BACKEND,
  E2E_ADMIN_FULFILLMENT_EMAIL: process.env.E2E_ADMIN_FULFILLMENT_EMAIL,
  E2E_ADMIN_FULFILLMENT_PASSWORD: process.env.E2E_ADMIN_FULFILLMENT_PASSWORD ? "SET" : "MISSING",
  E2E_ADMIN_FULFILLMENT_REQUESTED_GROUP_ID: process.env.E2E_ADMIN_FULFILLMENT_REQUESTED_GROUP_ID,
  E2E_ADMIN_FULFILLMENT_REQUESTED_ORDER_NUMBER: process.env.E2E_ADMIN_FULFILLMENT_REQUESTED_ORDER_NUMBER,
  E2E_ADMIN_FULFILLMENT_DIRECT_GROUP_ID: process.env.E2E_ADMIN_FULFILLMENT_DIRECT_GROUP_ID,
  E2E_ADMIN_FULFILLMENT_DIRECT_ORDER_NUMBER: process.env.E2E_ADMIN_FULFILLMENT_DIRECT_ORDER_NUMBER,
})

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")
test.skip(
  !hasAdminFixture,
  "Requires seeded admin fixture (set E2E_ADMIN_FULFILLMENT_EMAIL and E2E_ADMIN_FULFILLMENT_PASSWORD).",
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
  console.log("loginAsAdmin using", {
    email: process.env.E2E_ADMIN_FULFILLMENT_EMAIL,
    passwordSet: !!process.env.E2E_ADMIN_FULFILLMENT_PASSWORD,
  })

  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-fulfillment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(
    page,
    process.env.E2E_ADMIN_FULFILLMENT_EMAIL!,
    process.env.E2E_ADMIN_FULFILLMENT_PASSWORD!,
  )
}

async function gotoAdminFulfillment(page: Page) {
  await page.goto("/admin/fulfillment")
  await expect(page).toHaveURL(/\/admin\/fulfillment/, { timeout: 15_000 })
  await expect(page.getByTestId("admin-fulfillment-page")).toBeVisible({ timeout: 15_000 })
}

test.describe("requested Open Box shipment fixtures", () => {
  test.skip(!hasRequestedFixture, "Requires requested fulfillment fixture.")

  test("admin fulfillment list shows requested shipment distinctly", async ({ page }) => {
    const groupId = process.env.E2E_ADMIN_FULFILLMENT_REQUESTED_GROUP_ID!

    await loginAsAdmin(page)
    await gotoAdminFulfillment(page)

    const row = page.getByTestId("admin-fulfillment-row").filter({ hasText: groupId })
    await expect(row).toBeVisible({ timeout: 15_000 })
    await expect(row).toContainText(/requestedshipment|requested/i)
    await expect(row).toContainText(/locked_for_review|locked for review/i)
    await expect(row).toContainText(/ready_to_fulfill|ready to fulfill/i)
    await expect(row).toContainText(/orders:\s*1/i)
  })

  test("admin fulfillment detail shows included orders and invoice section", async ({ page }) => {
    const groupId = process.env.E2E_ADMIN_FULFILLMENT_REQUESTED_GROUP_ID!
    const orderNumber = process.env.E2E_ADMIN_FULFILLMENT_REQUESTED_ORDER_NUMBER!

    await loginAsAdmin(page)
    await page.goto(`/admin/fulfillment/${groupId}`)

    await expect(page.getByTestId("admin-fulfillment-detail-page")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("admin-fulfillment-detail-orders")).toBeVisible()
    await expect(page.getByTestId("admin-fulfillment-invoice-workflow")).toBeVisible()
    await expect(page.getByTestId("admin-fulfillment-pricing-panel")).toBeVisible()
    await expect(page.getByTestId("admin-fulfillment-detail-orders")).toContainText(orderNumber)
  })
})

test.describe("direct fulfillment fixtures", () => {
  test.skip(!hasDirectFixture, "Requires direct fulfillment fixture.")

  test("admin fulfillment list shows normal direct shipment separately from requested shipment flow", async ({ page }) => {
    const groupId = process.env.E2E_ADMIN_FULFILLMENT_DIRECT_GROUP_ID!

    await loginAsAdmin(page)
    await gotoAdminFulfillment(page)

    const row = page.getByTestId("admin-fulfillment-row").filter({ hasText: groupId })
    await expect(row).toBeVisible({ timeout: 15_000 })

    await expect(row).toContainText(/direct shipment/i)
    await expect(row).toContainText(/shipment:\s*none/i)
    await expect(row).toContainText(/box:\s*closed/i)
    await expect(row).toContainText(/fulfillment:\s*ready_to_fulfill|ready to fulfill/i)
    await expect(row).toContainText(/orders:\s*1/i)
    await expect(row).toContainText(/requested:\s*—|requested:\s*-/i)
  })

  test("admin fulfillment detail for direct shipment shows included orders and invoice handling", async ({ page }) => {
    const groupId = process.env.E2E_ADMIN_FULFILLMENT_DIRECT_GROUP_ID!
    const orderNumber = process.env.E2E_ADMIN_FULFILLMENT_DIRECT_ORDER_NUMBER!

    await loginAsAdmin(page)
    await page.goto(`/admin/fulfillment/${groupId}`)

    await expect(page.getByTestId("admin-fulfillment-detail-page")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("admin-fulfillment-detail-orders")).toBeVisible()
    await expect(page.getByTestId("admin-fulfillment-detail-orders")).toContainText(orderNumber)
    await expect(page.getByTestId("admin-fulfillment-detail-direct-ship-note")).toBeVisible()
  })
})
