import { test, expect } from "@playwright/test";

test("homepage shows public discovery sections", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Mineral Kingdom" })).toBeVisible();

  await expect(
    page.getByRole("heading", { name: /featured|latest|shop|discover/i }).first(),
  ).toBeVisible();
});