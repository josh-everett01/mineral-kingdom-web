import { test, expect } from "@playwright/test";

test("auth flow: protected redirect -> login -> account -> logout", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  test.skip(!email || !password, "E2E_EMAIL and E2E_PASSWORD must be set");

  // At this point they are still typed as possibly undefined,
  // so rebind with non-null assertions (safe because of the skip above)
  const e = email!;
  const p = password!;

  await page.context().clearCookies();

  await page.goto("/account");
  await expect(page).toHaveURL(/\/login(\?|$)/);

  await expect(page.getByTestId("login-title")).toBeVisible();

  await page.getByTestId("login-email").fill(e);
  await page.getByTestId("login-password").fill(p);

  const loginResponsePromise = page.waitForResponse((resp) => {
    return resp.url().includes("/api/bff/auth/login") && resp.request().method() === "POST";
  });

  await page.getByTestId("login-submit").click();

  const loginResp = await loginResponsePromise;

  if (!loginResp.ok()) {
    const status = loginResp.status();
    const bodyText = await loginResp.text().catch(() => "<unable to read body>");
    throw new Error(`Login failed: HTTP ${status}\nBody:\n${bodyText}`);
  }

  await expect(page).toHaveURL(/\/account/, { timeout: 15_000 });
  await expect(page.getByText("Authenticated:")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: /logout/i }).click();
  await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 15_000 });
});