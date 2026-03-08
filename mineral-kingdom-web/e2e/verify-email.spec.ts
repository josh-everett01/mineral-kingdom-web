import { test, expect } from "@playwright/test";

// Run only when backend is wired up (CI full-stack job sets E2E_BACKEND=1)
test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");

test("verify email page consumes token from registration flow", async ({ page }) => {
  const email = `verify-${Date.now()}@example.com`;
  const password = "Password123!";

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

  const token = ((await page.locator("code").textContent()) ?? "").trim();
  expect(token).toBeTruthy();

  await page.goto(`/verify-email?token=${encodeURIComponent(token)}`);

  await expect(page.getByTestId("verify-email-success")).toBeVisible();
  await expect(page.getByText("Email verified")).toBeVisible();
  await expect(page.getByRole("link", { name: /go to login/i })).toBeVisible();
});

test("verify email page shows error state when token is missing", async ({ page }) => {
  await page.goto("/verify-email");

  await expect(page.getByTestId("verify-email-error")).toBeVisible();
  await expect(page.getByText("Verification failed")).toBeVisible();
  await expect(page.getByRole("link", { name: /resend verification/i })).toBeVisible();
});