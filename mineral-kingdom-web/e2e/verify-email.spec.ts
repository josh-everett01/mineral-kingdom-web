import { test, expect } from "@playwright/test";

test("verify email page shows error state when token is missing", async ({ page }) => {
  await page.goto("/verify-email");

  await expect(page.getByTestId("verify-email-missing-token")).toBeVisible();
  await expect(page.getByText("Verification link needed")).toBeVisible();
  await expect(page.getByRole("link", { name: /resend verification/i })).toBeVisible();
});
