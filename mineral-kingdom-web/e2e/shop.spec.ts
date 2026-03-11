import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");

test("shop browse renders listings and supports canonical detail navigation", async ({ page }) => {
  await page.goto("/shop");

  await expect(page.getByTestId("shop-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Browse listings" })).toBeVisible();
  await expect(page.getByTestId("shop-filters")).toBeVisible();
  await expect(page.getByTestId("shop-results-grid")).toBeVisible();

  const cards = page.getByTestId("shop-listing-card");
  await expect(cards.first()).toBeVisible();

  const firstLink = page.getByTestId("shop-listing-card-link").first();
  const href = await firstLink.getAttribute("href");

  expect(href).toBeTruthy();
  expect(href).toMatch(/^\/listing\/.+-[0-9a-fA-F-]{36}$/);

  await firstLink.click();

  await expect(page).toHaveURL(/\/listing\/.+-[0-9a-fA-F-]{36}$/);
  await expect(page.getByTestId("listing-detail-page")).toBeVisible();
  await expect(page.getByTestId("listing-detail-title")).toBeVisible();
});

test("shop filters update the url and can narrow to fluorescent listings", async ({ page }) => {
  await page.goto("/shop");

  await expect(page.getByTestId("shop-page")).toBeVisible();

  const fluorescentToggle = page.getByTestId("shop-filter-fluorescent");
  await fluorescentToggle.click();

  await expect(page).toHaveURL(/fluorescent=true/);

  const fluorescentBadges = page.getByTestId("shop-listing-card-fluorescent");
  await expect(fluorescentBadges.first()).toBeVisible();
});

test("homepage listing cards route to canonical listing urls", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Mineral Kingdom" })).toBeVisible();

  const listingLink = page.getByRole("link", { name: "View Listing" }).first();
  await expect(listingLink).toBeVisible();

  const href = await listingLink.getAttribute("href");
  expect(href).toBeTruthy();
  expect(href).toMatch(/^\/listing\/.+-[0-9a-fA-F-]{36}$/);
});