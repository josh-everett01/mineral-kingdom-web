import { test, expect } from "@playwright/test";

test("home renders shell header + footer", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("link", { name: /Mineral Kingdom/ }).first()).toBeVisible();
  await expect(page.getByText("©")).toBeVisible();
});
