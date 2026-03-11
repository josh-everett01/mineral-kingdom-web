import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");

test("homepage shows public discovery sections", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Mineral Kingdom" })).toBeVisible();

  await expect(page.getByTestId("home-section-featured-listings")).toBeVisible();
  await expect(page.getByTestId("home-section-auctions-ending-soon")).toBeVisible();
  await expect(page.getByTestId("home-section-new-arrivals")).toBeVisible();

  await expect(page.getByTestId("home-section-browse-featured-listings")).toBeVisible();
  await expect(page.getByTestId("home-section-browse-auctions-ending-soon")).toBeVisible();
  await expect(page.getByTestId("home-section-browse-new-arrivals")).toBeVisible();
});