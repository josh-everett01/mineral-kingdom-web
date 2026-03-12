import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");

test("guest add to cart persists across refresh and shows warning", async ({ page }) => {
  await page.goto("/listing/rainbow-fluorite-tower-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1");

  await expect(page.getByTestId("listing-detail-page")).toBeVisible();
  await expect(page.getByTestId("listing-add-to-cart")).toBeVisible();

  await page.getByTestId("listing-add-to-cart").click();

  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId("cart-page")).toBeVisible();
  await expect(page.getByTestId("cart-warning-banner")).toBeVisible();
  await expect(page.getByTestId("cart-lines")).toBeVisible();
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
  await expect(page.getByTestId("cart-line-title").first()).toContainText("Rainbow Fluorite Tower");
  await expect(page.getByTestId("cart-line-quantity").first()).toContainText("Quantity: 1");
  await expect(page.getByTestId("cart-line-quantity-note").first()).toContainText(
    "quantity is fixed at 1",
  );

  await page.reload();

  await expect(page.getByTestId("cart-page")).toBeVisible();
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
  await expect(page.getByTestId("cart-line-title").first()).toContainText("Rainbow Fluorite Tower");
});

test("guest can remove a cart line", async ({ page }) => {
  await page.goto("/listing/rainbow-fluorite-tower-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1");

  await expect(page.getByTestId("listing-add-to-cart")).toBeVisible();
  await page.getByTestId("listing-add-to-cart").click();

  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId("cart-line")).toHaveCount(1);

  await page.getByTestId("cart-remove-button").first().click();

  await expect(page.getByTestId("cart-line")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("cart-empty-state")).toBeVisible();
});

test("empty cart page renders cleanly", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/cart");

  await expect(page.getByTestId("cart-page")).toBeVisible();
  await expect(page.getByTestId("cart-warning-banner")).toBeVisible();
  await expect(page.getByTestId("cart-empty-state")).toBeVisible();
});