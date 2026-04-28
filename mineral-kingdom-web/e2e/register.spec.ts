import { test, expect } from "@playwright/test";

test("register: validation + success state", async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `register-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });

  await page.route("**/api/bff/auth/register", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Registration successful. Check your email to verify your account.",
        nextStep: "Verify your email",
        verificationToken: "dev-verification-token",
      }),
    });
  });

  await page.goto("/register");

  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page.getByText(/enter a valid email address/i))
    .toBeVisible({ timeout: 2000 })
    .catch(() => {});
  await expect(page.getByText(/password must be at least 8/i))
    .toBeVisible({ timeout: 2000 })
    .catch(() => {});

  await page.getByLabel("Email").fill("nope");
  await page.getByLabel("Password").fill("123");
  await expect(page.getByText(/enter a valid email address/i)).toBeVisible();
  await expect(page.getByText(/at least 8/i)).toBeVisible();

  const email = `mk-test-${Date.now()}@example.com`;
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("CorrectHorseBatteryStaple1!");

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

  await expect(page.getByText("Check your email", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });
});
