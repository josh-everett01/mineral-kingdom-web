import { test, expect } from "@playwright/test"
import { waitForAuthenticatedSession } from "./helpers/session"

test.describe.configure({ mode: "serial" })

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")

type RegisterResponse = {
  verificationToken?: string
}

async function expectAuthenticatedAccount(
  page: import("@playwright/test").Page,
  email: string,
) {
  await waitForAuthenticatedSession(page, email)
}

test("auth flow: protected redirect -> login -> account -> logout", async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `auth-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  const email = `auth-${Date.now()}@example.com`
  const password = "Password123!"

  await page.context().clearCookies()

  await page.goto("/admin")
  await expect(page).toHaveURL(/\/login(\?|$)/)
  await expect(page.getByTestId("login-title")).toBeVisible()

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

  await expect(page.getByText("Check your email", { exact: true })).toBeVisible({
    timeout: 10_000,
  })

  const token = registerData.verificationToken?.trim() ?? ""
  expect(token).toBeTruthy()

  await page.goto(`/verify-email?token=${encodeURIComponent(token)}`)
  await expect(page.getByText("Email verified")).toBeVisible({ timeout: 10_000 })

  await page.goto("/login")
  await expect(page.getByTestId("login-title")).toBeVisible()

  const loginResponsePromise = page.waitForResponse((resp) => {
    return resp.url().includes("/api/bff/auth/login") && resp.request().method() === "POST"
  })

  await page.getByTestId("login-email").fill(email)
  await page.getByTestId("login-password").fill(password)
  await page.getByTestId("login-submit").click()

  const loginResp = await loginResponsePromise

  if (!loginResp.ok()) {
    const status = loginResp.status()
    const bodyText = await loginResp.text().catch(() => "<unable to read body>")
    throw new Error(`Login failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  await expectAuthenticatedAccount(page, email)

  await page.getByTestId("nav-logout").click()
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 })
})
