import { test, expect } from "@playwright/test";

test.skip(!!process.env.CI, "Auth e2e requires API/DB running locally");

test("auth flow: protected redirect -> login -> account -> logout", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) test.skip(true, "E2E_EMAIL and E2E_PASSWORD must be set");

  await page.context().clearCookies();

  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);

  // Ensure login page rendered
  await expect(page.getByTestId("login-title")).toBeVisible();

  await page.getByTestId("login-email").fill(email?.toString() ?? "");
  await page.getByTestId("login-password").fill(password?.toString() ?? "");
  await page.getByTestId("login-submit").click();

  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByText("Authenticated:")).toBeVisible();

  await page.getByRole("button", { name: /logout/i }).click();
  await expect(page).toHaveURL(/\/login/);
});