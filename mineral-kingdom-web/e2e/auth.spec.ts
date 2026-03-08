import { test, expect } from "@playwright/test";

test("auth flow: protected redirect -> login -> account -> logout", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) test.skip(true, "E2E_EMAIL and E2E_PASSWORD must be set");

  await page.context().clearCookies();

  // Hit a protected route -> expect redirect to login w/ next
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);

  // Ensure login page rendered
  await expect(page.getByTestId("login-title")).toBeVisible();

  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);

  // Click and wait for the login API response (don’t assume navigation)
  const [loginResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/bff/auth/login") && r.request().method() === "POST"),
    page.getByTestId("login-submit").click(),
  ]);

  // If this fails, your UI may stay on /login (which matches your current failure)
  expect(loginResp.ok()).toBeTruthy();

  // Now explicitly load /account (ensures cookie is applied + guard re-checks)
  await page.goto("/account");
  await expect(page).toHaveURL(/\/account/);

  await expect(page.getByText("Authenticated:")).toBeVisible({ timeout: 10_000 });

  // Logout and confirm we’re back at login
  await page.getByRole("button", { name: /logout/i }).click();
  await expect(page).toHaveURL(/\/login/);
});