import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");

test("guest can proceed from cart to checkout and start a hold", async ({ page }) => {
  await page.goto("/listing/rainbow-fluorite-tower-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1");

  await expect(page.getByTestId("listing-add-to-cart")).toBeVisible();
  await page.getByTestId("listing-add-to-cart").click();

  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId("cart-page")).toBeVisible();
  await expect(page.getByTestId("cart-checkout-link")).toBeVisible();

  await page.getByTestId("cart-checkout-link").click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByTestId("checkout-page")).toBeVisible();
  await expect(page.getByTestId("checkout-start-card")).toBeVisible();

  await page.getByTestId("checkout-guest-email").fill("guest@example.com");
  await page.getByTestId("checkout-start-button").click();

  await expect(page.getByTestId("checkout-active-hold")).toBeVisible();
  await expect(page.getByTestId("checkout-cart-id")).toBeVisible();
  await expect(page.getByTestId("checkout-hold-id")).toBeVisible();
  await expect(page.getByTestId("checkout-expires-at")).toBeVisible();
});

test("checkout return page shows neutral payment messaging", async ({ page }) => {
  await page.goto("/checkout/return");

  await expect(page.getByTestId("checkout-return-page")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /we recorded your return from the payment provider/i }),
  ).toBeVisible();
  await expect(page.getByText(/payment is not confirmed from this page alone/i)).toBeVisible();
});