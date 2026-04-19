import { test, expect, type Page, type Response } from "@playwright/test"

test.describe.configure({ mode: "serial" })

const hasAdminFixture = !!process.env.E2E_ADMIN_EMAIL && !!process.env.E2E_ADMIN_PASSWORD
const hasStaffFixture = !!process.env.E2E_STAFF_EMAIL && !!process.env.E2E_STAFF_PASSWORD

const ORDER_NUMBER = process.env.E2E_ADMIN_ORDERS_ORDER_NUMBER ?? "MK-E2E-ADMIN-ORDER-1"
const ORDER_EMAIL = process.env.E2E_ADMIN_ORDERS_ORDER_EMAIL ?? "smoke_user1@example.com"
const ORDER_ID =
  process.env.E2E_ADMIN_ORDERS_ORDER_ID ?? "f1111111-1111-1111-1111-111111111111"

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
    "X-Test-RateLimit-Key": `admin-orders-admin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!)
}

async function loginAsStaff(page: Page) {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-orders-staff-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(page, process.env.E2E_STAFF_EMAIL!, process.env.E2E_STAFF_PASSWORD!)
}

test.describe("admin orders", () => {
  test("owner can search orders by number", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto("/admin/orders", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-orders-page")).toBeVisible()

    await page.getByTestId("admin-orders-search").fill(ORDER_NUMBER)
    await page.getByRole("button", { name: "Search" }).click()

    const resultsArea = page.getByTestId("admin-orders-page")
    await expect(resultsArea).toContainText(ORDER_NUMBER, { timeout: 15_000 })
  })

  test("admin can search orders by email", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto("/admin/orders", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-orders-page")).toBeVisible()

    await page.getByTestId("admin-orders-search").fill(ORDER_EMAIL)
    await page.getByRole("button", { name: "Search" }).click()

    const resultsArea = page.getByTestId("admin-orders-page")
    await expect(resultsArea).toContainText(ORDER_EMAIL, { timeout: 15_000 })
  })

  test("admin can view order detail", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto(`/admin/orders/${ORDER_ID}`, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("admin-order-detail-page")).toBeVisible()
    await expect(page.getByTestId("admin-order-detail-order-number")).toContainText(ORDER_NUMBER)
    await expect(page.getByTestId("admin-order-detail-customer-email")).toContainText(ORDER_EMAIL)
    await expect(page.getByTestId("admin-order-detail-payment-context")).toBeVisible()
    await expect(page.getByTestId("admin-order-detail-refund-history")).toBeVisible()
  })

  test("owner sees refund action", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto(`/admin/orders/${ORDER_ID}`, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("admin-order-detail-page")).toBeVisible()
    await expect(page.getByTestId("admin-order-detail-refund-action")).toBeVisible()

    const refundPanel = page.getByTestId("admin-order-detail-refund-action")
    await expect(refundPanel).toContainText(/refund/i)
  })

  test("staff does not see refund form controls", async ({ page }) => {
    test.skip(
      !hasStaffFixture,
      "Requires seeded staff fixture (set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD).",
    )

    await loginAsStaff(page)

    await page.goto(`/admin/orders/${ORDER_ID}`, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("admin-order-detail-page")).toBeVisible()
    await expect(page.getByTestId("admin-order-detail-refund-action")).toBeVisible()

    await expect(page.getByTestId("admin-order-detail-refund-provider")).toHaveCount(0)
    await expect(page.getByTestId("admin-order-detail-refund-amount")).toHaveCount(0)
    await expect(page.getByTestId("admin-order-detail-refund-reason")).toHaveCount(0)
    await expect(page.getByTestId("admin-order-detail-refund-submit")).toHaveCount(0)
  })

  test("owner can submit refund when dedicated refundable fixture is provided", async ({ page }) => {
    test.skip(
      !process.env.E2E_ADMIN_ORDERS_REFUNDABLE_ORDER_ID,
      "Set E2E_ADMIN_ORDERS_REFUNDABLE_ORDER_ID to run destructive refund submission coverage.",
    )

    const refundableOrderId = process.env.E2E_ADMIN_ORDERS_REFUNDABLE_ORDER_ID!
    const refundableOrderNumber = process.env.E2E_ADMIN_ORDERS_REFUNDABLE_ORDER_NUMBER ?? ""

    await loginAsAdmin(page)

    await page.goto(`/admin/orders/${refundableOrderId}`, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("admin-order-detail-page")).toBeVisible()

    if (refundableOrderNumber) {
      await expect(page.getByTestId("admin-order-detail-order-number")).toContainText(
        refundableOrderNumber,
      )
    }

    const provider = page.getByTestId("admin-order-detail-refund-provider")
    const amount = page.getByTestId("admin-order-detail-refund-amount")
    const reason = page.getByTestId("admin-order-detail-refund-reason")
    const submit = page.getByTestId("admin-order-detail-refund-submit")

    await expect(provider).toBeVisible()
    await expect(amount).toBeVisible()
    await expect(reason).toBeVisible()
    await expect(submit).toBeVisible()

    const optionValues = await provider.locator("option").evaluateAll((options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        text: option.textContent ?? "",
      })),
    )

    const firstRealOption = optionValues.find(
      (option) => option.value.trim() && !/select provider/i.test(option.text),
    )

    expect(firstRealOption).toBeTruthy()

    if (!firstRealOption) {
      throw new Error("No refundable provider option was available.")
    }

    await provider.selectOption(firstRealOption.value)
    await amount.fill("1.00")
    await reason.fill("Playwright smoke refund")

    await submit.click()

    await expect(page.getByText(/refund submitted/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("admin-order-detail-refund-history")).toContainText(
      /playwright smoke refund/i,
    )
  })
})