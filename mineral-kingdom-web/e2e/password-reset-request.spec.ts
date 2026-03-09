import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");

test("password reset request page submits email and shows generic success", async ({ page }) => {
  await page.context().setExtraHTTPHeaders({
    "X-Test-RateLimit-Key": `password-reset-request-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
  });

  const email = `password-reset-${Date.now()}@example.com`;

  await page.goto("/password-reset/request");

  await page.getByTestId("password-reset-request-email").fill(email);

  const resetResponsePromise = page.waitForResponse((resp) => {
    return (
      resp.url().includes("/api/bff/auth/password-reset/request") &&
      resp.request().method() === "POST"
    );
  });

  await page.getByTestId("password-reset-request-submit").click();

  const resetResp = await resetResponsePromise;

  if (!resetResp.ok()) {
    const status = resetResp.status();
    const bodyText = await resetResp.text().catch(() => "<unable to read body>");
    throw new Error(`Password reset request failed: HTTP ${status}\nBody:\n${bodyText}`);
  }

  await expect(page.getByTestId("password-reset-request-success")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText("Check your email", { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByText("If an account exists, we sent password reset instructions.")
  ).toBeVisible({
    timeout: 10_000,
  });
});