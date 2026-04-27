import { test, expect, type Page, type Response } from "@playwright/test"

const hasStaffFixture = !!process.env.E2E_STAFF_EMAIL && !!process.env.E2E_STAFF_PASSWORD

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")

type RegisterResponse = {
  verificationToken?: string
}

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

test("anonymous user does not see dashboard or admin nav links", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByTestId("nav-home")).toBeVisible()
  await expect(page.getByTestId("nav-dashboard")).toHaveCount(0)
  await expect(page.getByTestId("nav-admin")).toHaveCount(0)
  await expect(page.getByTestId("nav-login")).toBeVisible()
  await expect(page.getByTestId("nav-register")).toBeVisible()
})

test("anonymous user sees register link in mobile menu", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/")

  await page.getByTestId("nav-menu-button").click()
  await expect(page.getByTestId("nav-mobile-menu")).toBeVisible()
  await expect(page.getByTestId("nav-register-mobile")).toBeVisible()
})

test("authenticated USER sees dashboard nav but not admin nav", async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `nav-user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  const email = `nav-user-${Date.now()}@example.com`
  const password = "Password123!"

  await page.goto("/register")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)

  const registerResponsePromise = page.waitForResponse((resp: Response) => {
    return resp.url().includes("/api/bff/auth/register") && resp.request().method() === "POST"
  })

  await page.getByRole("button", { name: /create account/i }).click()

  const registerResp = await registerResponsePromise
  if (!registerResp.ok()) {
    const status = registerResp.status()
    const bodyText = await registerResp.text().catch(() => "<unable to read body>")
    throw new Error(`Register failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  const registerData = (await registerResp.json()) as RegisterResponse
  const token = registerData.verificationToken?.trim() ?? ""
  expect(token).toBeTruthy()

  const verifyResponsePromise = page.waitForResponse((resp: Response) => {
    return resp.url().includes("/api/bff/auth/verify-email") && resp.request().method() === "POST"
  })

  await page.goto(`/verify-email?token=${encodeURIComponent(token)}`)

  const verifyResp = await verifyResponsePromise
  if (!verifyResp.ok()) {
    const status = verifyResp.status()
    const bodyText = await verifyResp.text().catch(() => "<unable to read body>")
    throw new Error(`Verify failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  await login(page, email, password)

  await page.goto("/")
  await expect(page.getByTestId("nav-home")).toBeVisible()
  await expect(page.getByTestId("nav-dashboard")).toBeVisible()
  await expect(page.getByTestId("nav-admin")).toHaveCount(0)
  await expect(page.getByTestId("nav-account")).toBeVisible()
  await expect(page.getByTestId("nav-register")).toHaveCount(0)
})

test("STAFF sees dashboard nav and admin nav", async ({ page }) => {
  test.skip(!hasStaffFixture, "Requires seeded staff fixture (set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD).")
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `nav-staff-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  await login(page, process.env.E2E_STAFF_EMAIL!, process.env.E2E_STAFF_PASSWORD!)

  await page.goto("/")
  await expect(page.getByTestId("nav-home")).toBeVisible()
  await expect(page.getByTestId("nav-dashboard")).toBeVisible()
  await expect(page.getByTestId("nav-admin")).toBeVisible()
  await expect(page.getByTestId("nav-account")).toBeVisible()
})