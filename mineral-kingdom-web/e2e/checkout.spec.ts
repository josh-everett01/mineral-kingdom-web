import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");

async function addCurrentListingToCart(page: import("@playwright/test").Page) {
  const addResponse = page.waitForResponse((response) => {
    return response.url().includes("/api/bff/cart") && response.request().method() === "PUT";
  });

  await page.getByTestId("listing-add-to-cart").click();

  const response = await addResponse;
  expect(response.ok()).toBeTruthy();
}

test("guest can proceed from cart to checkout and start a hold", async ({ page }) => {
  await page.goto("/listing/rainbow-fluorite-tower-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByTestId("listing-add-to-cart")).toBeVisible();

  await addCurrentListingToCart(page);

  await expect(page).toHaveURL(
    /\/listing\/rainbow-fluorite-tower-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1$/,
  );

  await page.goto("/cart", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId("cart-page")).toBeVisible();
  await expect(page.getByTestId("cart-checkout-link")).toBeVisible();

  await page.getByTestId("cart-checkout-link").click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByTestId("checkout-page")).toBeVisible();
  await expect(page.getByTestId("checkout-start-card")).toBeVisible();

  await page.getByTestId("checkout-guest-email").fill("guest@example.com");
  await page.getByTestId("checkout-start-button").click();

  await page.waitForURL(/\/checkout(\?.*)?$/, { timeout: 15000 });

  const error = page.getByTestId("checkout-start-error");
  if (await error.isVisible().catch(() => false)) {
    throw new Error(`Checkout start showed an error: ${await error.textContent()}`);
  }

  await expect(page.getByTestId("checkout-active-hold")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("checkout-cart-id")).toBeVisible();
  await expect(page.getByTestId("checkout-hold-id")).toBeVisible();
  await expect(page.getByTestId("checkout-expires-at")).toBeVisible();
  await expect(page.getByTestId("checkout-countdown")).toBeVisible();
  await expect(page.getByTestId("checkout-extension-count")).toBeVisible();
  await expect(page.getByTestId("checkout-continue-to-payment")).toBeVisible();
});

test("guest can continue from active checkout hold to payment page", async ({ page }) => {
  await page.goto("/listing/amethyst-cathedral-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4", {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByTestId("listing-add-to-cart")).toBeVisible();

  await addCurrentListingToCart(page);

  await expect(page).toHaveURL(
    /\/listing\/amethyst-cathedral-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4$/,
  );

  await page.goto("/cart", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId("cart-page")).toBeVisible();
  await expect(page.getByTestId("cart-checkout-link")).toBeVisible();

  await page.getByTestId("cart-checkout-link").click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByTestId("checkout-page")).toBeVisible();
  await expect(page.getByTestId("checkout-start-card")).toBeVisible();

  await page.getByTestId("checkout-guest-email").fill("guest@example.com");
  await page.getByTestId("checkout-start-button").click();

  await page.waitForURL(/\/checkout(\?.*)?$/, { timeout: 15000 });

  const error = page.getByTestId("checkout-start-error");
  if (await error.isVisible().catch(() => false)) {
    throw new Error(`Checkout start showed an error: ${await error.textContent()}`);
  }

  await expect(page.getByTestId("checkout-active-hold")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("checkout-continue-to-payment")).toBeVisible();

  const holdId = (await page.getByTestId("checkout-hold-id").textContent())?.trim();
  expect(holdId).toBeTruthy();

  await page.getByTestId("checkout-continue-to-payment").click();

  await expect(page).toHaveURL(/\/checkout\/pay/);
  await expect(page.getByTestId("checkout-pay-page")).toBeVisible();
  await expect(page.getByTestId("checkout-pay-hold-id")).toBeVisible();
  await expect(page.getByTestId("checkout-pay-countdown")).toBeVisible();
  await expect(page.getByTestId("checkout-pay-extension-count")).toBeVisible();
  await expect(page.getByTestId("checkout-pay-start")).toBeVisible();
  await expect(page.getByTestId("checkout-pay-hold-id")).toContainText(holdId!);
});

test("payment page requires checkout hold when none is available", async ({ page }) => {
  await page.goto("/checkout/pay", { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("checkout-pay-page")).toBeVisible();
  await expect(page.getByTestId("checkout-pay-missing-hold")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /a checkout hold is required before payment can begin/i }),
  ).toBeVisible();
  await expect(page.getByTestId("checkout-pay-return-to-checkout")).toBeVisible();
});

test("checkout return page stays neutral when no payment session is available", async ({ page }) => {
  await page.goto("/checkout/return", { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("checkout-return-page")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /we recorded your return from the payment provider/i }),
  ).toBeVisible();
  await expect(page.getByTestId("checkout-return-missing-payment")).toBeVisible();
  await expect(page.getByTestId("checkout-return-copy")).toContainText(
    /never treated as proof of payment/i,
  );
});

test("checkout return page does not trust provider redirect params as paid proof", async ({ page }) => {
  await page.goto("/checkout/return?success=1&status=paid&orderId=fake-order-123", {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByTestId("checkout-return-page")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /we recorded your return from the payment provider/i }),
  ).toBeVisible();
  await expect(page.getByTestId("checkout-return-copy")).toContainText(
    /never treated as proof of payment/i,
  );
  await expect(page.getByTestId("checkout-return-missing-payment")).toBeVisible();
});

test("checkout return page shows cancelled state without marking order paid", async ({ page }) => {
  await page.goto("/checkout/return?cancelled=1", { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("checkout-return-page")).toBeVisible();
  await expect(page.getByTestId("checkout-return-cancelled")).toBeVisible();
  await expect(page.getByTestId("checkout-return-copy")).toContainText(
    /never treated as proof of payment/i,
  );
});