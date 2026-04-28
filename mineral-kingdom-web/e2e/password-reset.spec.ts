import { test, expect } from "@playwright/test"

test.describe.configure({ mode: "serial" })

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")

type RegisterResponse = {
  verificationToken?: string
}

type PasswordResetRequestApiResponse = {
  ok?: boolean
  resetToken?: string
}

async function expectAuthenticatedAccount(
  page: import("@playwright/test").Page,
  email: string,
) {
  await expect(page).toHaveURL(/\/account|\/dashboard/, { timeout: 15_000 })
  await page.goto("/account")

  const sessionCard = page.getByTestId("account-session-card")
  if (await sessionCard.count()) {
    await expect(sessionCard).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("account-authenticated-value")).toHaveText("Yes", {
      timeout: 15_000,
    })
    await expect(page.getByTestId("account-email-value")).toHaveText(email, {
      timeout: 15_000,
    })
    return
  }

  await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 })
}

test("password reset happy path: request -> confirm -> login", async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `password-reset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })

  const email = `password-reset-${Date.now()}@example.com`
  const originalPassword = "Password123!"
  const newPassword = "NewPassword123!"

  await page.goto("/register")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(originalPassword)

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
  const verificationToken = registerData.verificationToken?.trim() ?? ""
  expect(verificationToken).toBeTruthy()

  await expect(page.getByText("Check your email", { exact: true })).toBeVisible({
    timeout: 15_000,
  })

  const verifyResponsePromise = page.waitForResponse((resp) => {
    return resp.url().includes("/api/bff/auth/verify-email") && resp.request().method() === "POST"
  })

  await page.goto(`/verify-email?token=${encodeURIComponent(verificationToken)}`)

  const verifyResp = await verifyResponsePromise

  if (!verifyResp.ok()) {
    const status = verifyResp.status()
    const bodyText = await verifyResp.text().catch(() => "<unable to read body>")
    throw new Error(`Verify failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  await expect(page.getByText("Email verified")).toBeVisible({ timeout: 10_000 })

  await page.goto("/password-reset/request")
  await page.getByTestId("password-reset-request-email").click()
  await page.getByTestId("password-reset-request-email").fill("")
  await page.getByTestId("password-reset-request-email").pressSequentially(email)
  await expect(page.getByTestId("password-reset-request-email")).toHaveValue(email)
  await page.getByTestId("password-reset-request-email").blur()

  const resetRequestPromise = page.waitForResponse((resp) => {
    return (
      resp.url().includes("/api/bff/auth/password-reset/request") &&
      resp.request().method() === "POST"
    )
  })

  await page.getByTestId("password-reset-request-submit").click()

  const resetResp = await resetRequestPromise

  if (!resetResp.ok()) {
    const status = resetResp.status()
    const bodyText = await resetResp.text().catch(() => "<unable to read body>")
    throw new Error(`Password reset request failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  const resetData = (await resetResp.json()) as PasswordResetRequestApiResponse
  const resetToken = resetData.resetToken?.trim() ?? ""
  expect(resetToken).toBeTruthy()

  await expect(page.getByTestId("password-reset-request-success")).toBeVisible({
    timeout: 10_000,
  })

  const confirmResponsePromise = page.waitForResponse((resp) => {
    return (
      resp.url().includes("/api/bff/auth/password-reset/confirm") &&
      resp.request().method() === "POST"
    )
  })

  await page.goto(`/password-reset/confirm?token=${encodeURIComponent(resetToken)}`)

  await page.getByTestId("password-reset-confirm-new-password").fill(newPassword)
  await page.getByTestId("password-reset-confirm-confirm-password").fill(newPassword)
  await page.getByTestId("password-reset-confirm-submit").click()

  const confirmResp = await confirmResponsePromise

  if (!confirmResp.ok()) {
    const status = confirmResp.status()
    const bodyText = await confirmResp.text().catch(() => "<unable to read body>")
    throw new Error(`Password reset confirm failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })

  await page.goto("/login")
  await expect(page.getByTestId("login-title")).toBeVisible()
  await expect(page.getByTestId("login-email")).toBeVisible()
  await expect(page.getByTestId("login-password")).toBeVisible()
  await expect(page.getByTestId("login-submit")).toBeVisible()

  await page.getByTestId("login-email").fill(email)
  await expect(page.getByTestId("login-email")).toHaveValue(email)

  await page.getByTestId("login-password").fill(newPassword)
  await expect(page.getByTestId("login-password")).toHaveValue(newPassword)

  const loginResponsePromise = page.waitForResponse((resp) => {
    return resp.url().includes("/api/bff/auth/login") && resp.request().method() === "POST"
  })

  await page.getByTestId("login-submit").click()

  const loginResp = await loginResponsePromise

  if (!loginResp.ok()) {
    const status = loginResp.status()
    const bodyText = await loginResp.text().catch(() => "<unable to read body>")
    throw new Error(`Login failed: HTTP ${status}\nBody:\n${bodyText}`)
  }

  await expectAuthenticatedAccount(page, email)
})
