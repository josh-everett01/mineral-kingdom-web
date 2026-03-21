import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");

const FRONTEND_ORIGIN = "http://127.0.0.1:3005";
const BACKEND_ORIGIN = "http://127.0.0.1:8080";
const COOKIE_DOMAIN = "127.0.0.1";
const RETURN_TEST_OFFER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa9";

async function reseedBackend(request: import("@playwright/test").APIRequestContext) {
  const response = await request.post(`${BACKEND_ORIGIN}/api/testing/e2e/seed`);
  expect(response.ok()).toBeTruthy();
}

async function seedCartLineViaBackend(
  page: import("@playwright/test").Page,
  offerId: string,
) {
  const getCartRes = await page.request.get(`${BACKEND_ORIGIN}/api/cart`);
  expect(getCartRes.ok()).toBeTruthy();

  const cartId = getCartRes.headers()["x-cart-id"];
  expect(cartId).toBeTruthy();

  await page.context().addCookies([
    {
      name: "mk_cart_id",
      value: cartId!,
      domain: COOKIE_DOMAIN,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);

  const addLineRes = await page.request.put(`${BACKEND_ORIGIN}/api/cart/lines`, {
    headers: {
      "x-cart-id": cartId!,
      "content-type": "application/json",
    },
    data: {
      offerId,
      quantity: 1,
    },
  });

  expect(addLineRes.ok()).toBeTruthy();

  return { cartId: cartId! };
}

async function createGuestCheckoutPayment(
  page: import("@playwright/test").Page,
  offerId: string,
) {
  const { cartId } = await seedCartLineViaBackend(page, offerId);

  const startCheckoutRes = await page.request.post(`${BACKEND_ORIGIN}/api/checkout/start`, {
    headers: {
      "x-cart-id": cartId,
      "content-type": "application/json",
    },
    data: {
      email: "guest@example.com",
    },
  });

  if (!startCheckoutRes.ok()) {
    throw new Error(
      `checkout/start failed: HTTP ${startCheckoutRes.status()}\nBody:\n${await startCheckoutRes.text()}`,
    );
  }

  const startCheckoutBody = (await startCheckoutRes.json()) as {
    cartId: string;
    holdId: string;
    expiresAt: string;
  };

  const startPaymentRes = await page.request.post(`${BACKEND_ORIGIN}/api/payments/start`, {
    headers: {
      "content-type": "application/json",
    },
    data: {
      holdId: startCheckoutBody.holdId,
      provider: "STRIPE",
      successUrl: `${FRONTEND_ORIGIN}/checkout/return`,
      cancelUrl: `${FRONTEND_ORIGIN}/checkout/return?cancelled=1`,
    },
  });

  if (!startPaymentRes.ok()) {
    throw new Error(
      `payments/start failed: HTTP ${startPaymentRes.status()}\nBody:\n${await startPaymentRes.text()}`,
    );
  }

  const startPaymentBody = (await startPaymentRes.json()) as {
    paymentId: string;
  };

  return {
    cartId,
    holdId: startCheckoutBody.holdId,
    paymentId: startPaymentBody.paymentId,
  };
}

function stripeCheckoutSessionCompletedPayload(
  holdId: string,
  paymentId: string,
  paymentIntentId: string,
) {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_e2e_checkout_return",
        payment_intent: paymentIntentId,
        metadata: {
          hold_id: holdId,
          payment_id: paymentId,
        },
      },
    },
  };
}

test.beforeEach(async ({ request }) => {
  await reseedBackend(request);
});

test("checkout return page redirects to confirmed order after backend payment confirmation", async ({
  page,
}) => {
  const { paymentId, holdId } = await createGuestCheckoutPayment(page, RETURN_TEST_OFFER_ID);

  await page.addInitScript((pid: string) => {
    window.sessionStorage.setItem("mk_checkout_payment_id", pid);
  }, paymentId);

  await page.goto("/checkout/return", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("checkout-return-page")).toBeVisible();

  const preConfirmRes = await page.request.get(
    `${BACKEND_ORIGIN}/api/payments/${paymentId}/confirmation`,
  );
  expect(preConfirmRes.ok()).toBeTruthy();

  const webhookPayload = stripeCheckoutSessionCompletedPayload(
    holdId,
    paymentId,
    `pi_e2e_${Date.now()}`,
  );

  const webhookRes = await page.request.post(`${BACKEND_ORIGIN}/api/webhooks/stripe`, {
    headers: {
      "content-type": "application/json",
      "x-stripe-event-id": `evt_e2e_${Date.now()}`,
    },
    data: webhookPayload,
  });

  if (!webhookRes.ok()) {
    throw new Error(
      `stripe webhook failed: HTTP ${webhookRes.status()}\nBody:\n${await webhookRes.text()}`
    );
  }

  await expect
    .poll(
      async () => {
        const res = await page.request.get(
          `${BACKEND_ORIGIN}/api/payments/${paymentId}/confirmation`,
        );

        const body = await res.json().catch(() => null);

        return {
          status: res.status(),
          ok: res.ok(),
          body,
        };
      },
      {
        timeout: 20000,
        intervals: [250, 500, 1000],
      },
    )
    .toMatchObject({
      status: 200,
      ok: true,
      body: {
        paymentId,
        paymentStatus: "SUCCEEDED",
        isConfirmed: true,
      },
    });

  await expect(page).toHaveURL(/\/order-confirmation\?/, { timeout: 10000 });
  await expect(page.getByTestId("order-confirmation-page")).toBeVisible();
  await expect(page.getByTestId("order-confirmation-card")).toBeVisible();

  await expect
    .poll(async () => {
      return (await page.getByTestId("order-confirmation-status").textContent())?.trim();
    })
    .not.toBe("—");

  await expect(page.getByTestId("order-confirmation-status")).toContainText(/READY_TO_FULFILL/i);
  await expect(page.getByTestId("order-confirmation-payment-status")).toContainText(/SUCCEEDED/i);
});