import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");

test("shop browse page loads successfully", async ({ page }) => {
  await page.goto("/shop");

  await expect(page.getByTestId("shop-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Browse listings" })).toBeVisible();
  await expect(page.getByTestId("shop-filters")).toBeVisible();
  await expect(page.getByTestId("shop-results-summary")).toBeVisible();

  const gridCount = await page.getByTestId("shop-results-grid").count();
  const emptyCount = await page.getByTestId("shop-empty-state").count();

  expect(gridCount + emptyCount).toBeGreaterThan(0);
});

test("shop filters update the url", async ({ page }) => {
  await page.goto("/shop");

  await expect(page.getByTestId("shop-page")).toBeVisible();

  await page.getByTestId("shop-filter-fluorescent").click();
  await expect(page).toHaveURL(/fluorescent=true/);

  await page.getByTestId("shop-filter-sort").selectOption("price_asc");
  await expect(page).toHaveURL(/sort=price_asc/);
});

test("shop listing cards navigate to canonical listing urls when data is present", async ({ page }) => {
  await page.goto("/shop");

  await expect(page.getByTestId("shop-page")).toBeVisible();

  const cards = page.getByTestId("shop-listing-card");
  const cardCount = await cards.count();

  test.skip(cardCount === 0, "No public listings available in this environment.");

  const firstLink = page.getByTestId("shop-listing-card-link").first();
  const href = await firstLink.getAttribute("href");

  expect(href).toBeTruthy();
  expect(href).toMatch(/^\/listing\/.+-[0-9a-fA-F-]{36}$/);

  await firstLink.click();

  await expect(page).toHaveURL(/\/listing\/.+-[0-9a-fA-F-]{36}$/);
  await expect(page.getByTestId("listing-detail-page")).toBeVisible();
  await expect(page.getByTestId("listing-detail-title")).toBeVisible();
});

test("homepage listing cards use canonical listing urls when data is present", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Mineral Kingdom" })).toBeVisible();

  const listingLinks = page.getByRole("link", { name: "View Listing" });
  const linkCount = await listingLinks.count();

  test.skip(linkCount === 0, "No homepage listing cards available in this environment.");

  const href = await listingLinks.first().getAttribute("href");
  expect(href).toBeTruthy();
  expect(href).toMatch(/^\/listing\/.+-[0-9a-fA-F-]{36}$/);
});