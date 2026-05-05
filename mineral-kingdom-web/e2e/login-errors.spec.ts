import { expect, test } from "@playwright/test"

test("login shows a friendly invalid credentials message", async ({ page }) => {
  await page.route("**/api/bff/auth/login", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: "The email or password you entered is incorrect.",
      }),
    })
  })

  await page.goto("/login")
  await expect(page.getByTestId("login-title")).toBeVisible()

  await page.getByTestId("login-email").fill("member@example.com")
  await page.getByTestId("login-password").fill("not-the-password")
  await page.getByTestId("login-submit").click()

  await expect(page.getByTestId("login-error")).toContainText(
    "The email or password you entered is incorrect.",
  )
  await expect(page.getByTestId("login-error")).not.toContainText("401")
})
