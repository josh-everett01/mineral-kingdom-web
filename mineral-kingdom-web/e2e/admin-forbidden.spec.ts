import { test, expect } from "@playwright/test"

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")

type RegisterResponse = {
  verificationToken?: string
}

test("authenticated USER visiting admin route sees 403", async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `admin-forbidden-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  const email = `admin-forbidden-${Date.now()}@example.com`
  const password = "Password123!"

  await page.goto("/register")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)

  const registerResponsePromise = page.waitForResponse((resp) => {
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

  const verifyResponsePromise = page.waitForResponse((resp) => {
    return resp.url().includes("/api/bff/auth/verify-email") && resp.request().method() === "POST"
  })

  await page.goto(`/verify-email?token=${encodeURIComponent(token)}`)

  const verifyResp = await verifyResponsePromise
  if (!verifyResp.ok()) {
    const status = verifyResp.status()
    const bodyText = await verifyResp.text().catch(() => "<unable to read body>")
    throw new Error(`Verify failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  await page.goto("/login")
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

  await expect(page).toHaveURL(/\/account/, { timeout: 15_000 })

  await page.goto("/admin/store/offers")
  await expect(page).toHaveURL(/\/403/, { timeout: 15_000 })
  await expect(page.getByTestId("forbidden-page")).toBeVisible()
  await expect(page.getByTestId("forbidden-page")).toContainText(/access denied/i)
  await expect(page.getByTestId("forbidden-message")).toBeVisible()
  await expect(page.getByRole("link", { name: /back home/i })).toBeVisible()
})