import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");

test("password reset request page submits email and shows generic success", async ({ page }) => {
  const email = `password-reset-${Date.now()}@example.com`;

  await page.goto("/password-reset/request");

  await page.getByTestId("password-reset-request-email").fill(email);
  await page.getByTestId("password-reset-request-submit").click();

  await expect(page.getByTestId("password-reset-request-success")).toBeVisible();
  await expect(page.getByText("Check your email", { exact: true })).toBeVisible();
  await expect(
    page.getByText("If an account exists, we sent password reset instructions.")
  ).toBeVisible();
});