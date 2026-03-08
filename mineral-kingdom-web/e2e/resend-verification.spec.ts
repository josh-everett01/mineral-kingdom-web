import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");

test("resend verification page submits email and shows generic success", async ({ page }) => {
  const email = `resend-${Date.now()}@example.com`;

  await page.goto("/resend-verification");

  await page.getByTestId("resend-verification-email").fill(email);
  await page.getByTestId("resend-verification-submit").click();

  await expect(page.getByTestId("resend-verification-success")).toBeVisible();
  await expect(page.getByText("Check your email", { exact: true })).toBeVisible();
  await expect(
    page.getByText("If an account exists and is unverified, we sent a new email.")
  ).toBeVisible();
});