import { test, expect } from "@playwright/test";

test("auth flow: protected redirect -> login -> account -> logout", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) test.skip(true, "E2E_EMAIL and E2E_PASSWORD must be set");

  await page.context().clearCookies();

  // Hit a protected page; should redirect to login
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login(\?|$)/);

  // Ensure login page rendered
  await expect(page.getByTestId("login-title")).toBeVisible();

  // Fill creds
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);

  // Capture the actual BFF login response for debugging
  const loginResponsePromise = page.waitForResponse((resp) => {
    return resp.url().includes("/api/bff/auth/login") && resp.request().method() === "POST";
  });

  // Submit via UI (this ensures cookies/session are set exactly like a real user)
  await page.getByTestId("login-submit").click();

  const loginResp = await loginResponsePromise;

  if (!loginResp.ok()) {
    const status = loginResp.status();
    let bodyText = "";
    try {
      bodyText = await loginResp.text();
    } catch {
      bodyText = "<unable to read body>";
    }

    // This will show in CI logs and make the failure actionable
    throw new Error(`Login failed: HTTP ${status}\nBody:\n${bodyText}`);
  }

  // Now ensure we actually reach /account (guard re-checks with cookies applied)
  await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });
  await expect(page.getByText("Authenticated:")).toBeVisible({ timeout: 15_000 });

  // Logout
  await page.getByRole("button", { name: /logout/i }).click();
  await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 15_000 });
});