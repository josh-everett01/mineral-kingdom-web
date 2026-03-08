import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");

test("register -> verify -> login happy path", async ({ page }) => {
  const email = `register-verify-login-${Date.now()}@example.com`;
  const password = "Password123!";

  // Register
  await page.goto("/register");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  const registerResponsePromise = page.waitForResponse((resp) => {
    return resp.url().includes("/api/bff/auth/register") && resp.request().method() === "POST";
  });

  await page.getByRole("button", { name: /create account/i }).click();

  const registerResp = await registerResponsePromise;

  if (!registerResp.ok()) {
    const status = registerResp.status();
    const bodyText = await registerResp.text().catch(() => "<unable to read body>");
    throw new Error(`Register failed: HTTP ${status}\nBody:\n${bodyText}`);
  }

  await expect(page.getByText("Check your email", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(email)).toBeVisible();

  const token = ((await page.locator("code").textContent()) ?? "").trim();
  expect(token).toBeTruthy();

  // Verify
  await page.goto(`/verify-email?token=${encodeURIComponent(token)}`);

  await expect(page.getByTestId("verify-email-success")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Email verified")).toBeVisible();

  // Login
  await page.goto("/login");
  await expect(page.getByTestId("login-title")).toBeVisible();

  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);

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
  await expect(page.getByText(email)).toBeVisible();
});