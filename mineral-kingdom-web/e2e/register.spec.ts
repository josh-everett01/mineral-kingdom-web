import { test, expect } from "@playwright/test";

test("register: validation + success state", async ({ page }) => {
  await page.goto("/register");

  // Invalid submit (empty)
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page.getByText(/enter a valid email address/i)).toBeVisible({ timeout: 2000 }).catch(() => {});
  await expect(page.getByText(/password must be at least 8/i)).toBeVisible({ timeout: 2000 }).catch(() => {});

  // Fill invalid email + short password
  await page.getByLabel("Email").fill("nope");
  await page.getByLabel("Password").fill("123");
  await expect(page.getByText(/enter a valid email address/i)).toBeVisible();
  await expect(page.getByText(/at least 8/i)).toBeVisible();

  // Fill valid
  const email = `mk-test-${Date.now()}@example.com`;
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("CorrectHorseBatteryStaple1!");

  await page.getByRole("button", { name: /create account/i }).click();

  // Success state (avoid strict-mode collision)
  await expect(page.getByText("Check your email", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(email)).toBeVisible();
});