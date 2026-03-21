import { test, expect, type Page } from "@playwright/test";

const hasBackend = !!process.env.E2E_BACKEND;
const APP_ORIGIN = "http://127.0.0.1:3005";

const RAINBOW_LISTING_URL =
  "/listing/rainbow-fluorite-tower-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
const AMETHYST_LISTING_URL =
  "/listing/amethyst-cathedral-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4";
const AMETHYST_OFFER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6";

async function addCurrentListingToCart(page: Page) {
  await page.getByTestId("listing-add-to-cart").click();

  await expect(page).toHaveURL(/\/listing\/.+-[0-9a-fA-F-]{36}$/, {
    timeout: 15000,
  });
}

async function seedCartLineViaBff(page: Page, offerId: string) {
  const bootstrap = await page.request.get(`${APP_ORIGIN}/api/bff/cart`);
  expect(bootstrap.ok()).toBeTruthy();

  const setCookieHeader = bootstrap.headers()["set-cookie"];
  const match = setCookieHeader?.match(/mk_cart_id=([^;]+)/);
  expect(match?.[1]).toBeTruthy();

  const cartId = match![1];

  await page.context().addCookies([
    {
      name: "mk_cart_id",
      value: cartId,
      url: APP_ORIGIN,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);

  const addRes = await page.request.put(`${APP_ORIGIN}/api/bff/cart`, {
    headers: {
      cookie: `mk_cart_id=${cartId}`,
      "content-type": "application/json",
    },
    data: {
      offerId,
      quantity: 1,
    },
  });

  expect(addRes.ok()).toBeTruthy();
}

async function setStoredCheckoutPaymentId(page: Page, paymentId: string) {
  await page.addInitScript((id: string) => {
    window.sessionStorage.setItem("mk_checkout_payment_id", id);
  }, paymentId);
}

test.describe("checkout flows (backend required)", () => {
  test.skip(!hasBackend, "Requires backend running (set E2E_BACKEND=1).");

  test("guest can proceed from cart to checkout and start a hold", async ({ page }) => {
    await page.goto(RAINBOW_LISTING_URL, {
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
    await expect(page.getByTestId("cart-line")).toHaveCount(1, { timeout: 15000 });
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
    await seedCartLineViaBff(page, AMETHYST_OFFER_ID);

    await page.goto("/cart", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByTestId("cart-page")).toBeVisible();
    await expect(page.getByTestId("cart-line")).toHaveCount(1, { timeout: 15000 });
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
});

test.describe("checkout return page", () => {
  test("stays neutral when no payment session is available", async ({ page }) => {
    await page.goto("/checkout/return", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("checkout-return-page")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /we recorded your return from the payment provider/i }),
    ).toBeVisible();

    await expect(page.getByTestId("checkout-return-status-message")).toBeVisible();
    await expect(page.getByTestId("checkout-return-copy")).toContainText(
      /never treated as proof of payment/i,
    );
    await expect(page.getByTestId("checkout-return-status-message")).toContainText(
      /confirming payment now|waiting for backend payment confirmation/i,
    );
  });

  test("does not trust provider redirect params as paid proof", async ({ page }) => {
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
    await expect(page.getByTestId("checkout-return-status-message")).toBeVisible();
  });

  test("shows cancelled state without marking order paid", async ({ page }) => {
    await page.goto("/checkout/return?cancelled=1", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("checkout-return-page")).toBeVisible();
    await expect(page.getByTestId("checkout-return-cancelled")).toBeVisible();
    await expect(page.getByTestId("checkout-return-copy")).toContainText(
      /never treated as proof of payment/i,
    );
    await expect(page.getByTestId("checkout-return-cancelled")).toContainText(
      /cancelled\. no purchase was confirmed/i,
    );
  });

  test("shows pending confirmation UX with progress, warning, and live status", async ({
    page,
  }) => {
    const paymentId = "5935a82d-61f9-448b-bea3-e98d37063814";

    await setStoredCheckoutPaymentId(page, paymentId);

    await page.route(`**/api/bff/payments/${paymentId}/confirmation`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          paymentId,
          provider: "stripe",
          paymentStatus: "REDIRECTED",
          isConfirmed: false,
          orderId: null,
          orderNumber: null,
          orderStatus: null,
          orderTotalCents: null,
          orderCurrencyCode: null,
          guestEmail: null,
        }),
      });
    });

    await page.route(`**/api/bff/sse/checkout-payments/${paymentId}`, async (route) => {
      await route.abort();
    });

    await page.goto("/checkout/return", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("checkout-return-page")).toBeVisible();
    await expect(page.getByTestId("checkout-return-status-message")).toBeVisible();
    await expect(page.getByTestId("checkout-return-progress")).toBeVisible();
    await expect(page.getByTestId("checkout-return-status-message")).toContainText(
      /confirming payment now/i,
    );

    await expect(
      page.getByTestId("checkout-return-status-message").getByText("Please keep this page open", {
        exact: true,
      }),
    ).toBeVisible();

    await expect(page.getByTestId("checkout-return-live-status")).toContainText(
      /current payment status:\s*REDIRECTED\./i,
    );
  });

  test("redirects to order confirmation after backend-confirmed payment arrives", async ({
  page,
}) => {
  const paymentId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const orderId = "11111111-2222-3333-4444-555555555555";

  await setStoredCheckoutPaymentId(page, paymentId);

  await page.route(`**/api/bff/sse/checkout-payments/${paymentId}`, async (route) => {
    await route.abort();
  });

  await page.route(`**/api/bff/payments/${paymentId}/confirmation`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        paymentId,
        provider: "stripe",
        paymentStatus: "SUCCEEDED",
        isConfirmed: true,
        orderId,
        orderNumber: "MK-20260321-B13F2C",
        orderStatus: "READY_TO_FULFILL",
        orderTotalCents: 21900,
        orderCurrencyCode: "USD",
        guestEmail: "popopopopopop@awsed.com",
      }),
    });
  });

  await page.route(`**/api/bff/orders/${orderId}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: orderId,
        orderNumber: "MK-20260321-B13F2C",
        status: "READY_TO_FULFILL",
        totalCents: 21900,
        currencyCode: "USD",
        paymentStatus: "SUCCEEDED",
        provider: "stripe",
        guestEmail: "popopopopopop@awsed.com",
        isConfirmed: true,
      }),
    });
  });

  await page.route("**/api/bff/cart", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "cart-test-id",
        status: "ACTIVE",
        lines: [],
        notices: [],
      }),
    });
  });

  await page.route(`**/api/bff/sse/orders/${orderId}`, async (route) => {
    await route.abort();
  });

  await page.goto("/checkout/return", { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("checkout-return-page")).toBeVisible();

  await page.waitForFunction(
    ({ expectedOrderId, expectedPaymentId }) => {
      const url = new URL(window.location.href);
      return (
        url.pathname === "/order-confirmation" &&
        url.searchParams.get("orderId") === expectedOrderId &&
        url.searchParams.get("paymentId") === expectedPaymentId
      );
    },
    { expectedOrderId: orderId, expectedPaymentId: paymentId },
  );

  await expect(page.getByTestId("order-confirmation-page")).toBeVisible();
  await expect(page.getByTestId("order-confirmation-card")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /your order status is backend-confirmed/i }),
  ).toBeVisible();
  await expect(page.getByTestId("order-confirmation-payment-status")).toContainText(
    "SUCCEEDED",
  );
  await expect(page.getByTestId("order-confirmation-provider")).toContainText("stripe");
  await expect(page.getByTestId("order-confirmation-total")).toContainText("$219.00");
});
});