import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");

test.describe.configure({ mode: "serial" });

const RAINBOW_LISTING_URL =
  "/listing/rainbow-fluorite-tower-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
const RAINBOW_OFFER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3";

async function reseedBackend(request: import("@playwright/test").APIRequestContext) {
  const response = await request.post("http://localhost:8080/api/testing/e2e/seed");
  expect(response.ok()).toBeTruthy();
}

async function waitForCartToContainLine(page: import("@playwright/test").Page) {
  await expect
    .poll(
      async () => {
        const cookies = await page.context().cookies();
        const mkCartCookie = cookies.find((c) => c.name === "mk_cart_id");
        if (!mkCartCookie) return 0;

        const cartRes = await page.request.get("http://localhost:3005/api/bff/cart", {
          headers: {
            cookie: `mk_cart_id=${mkCartCookie.value}`,
          },
        });

        if (!cartRes.ok()) return 0;

        const body = (await cartRes.json()) as {
          lines?: Array<unknown>;
        };

        return body.lines?.length ?? 0;
      },
      {
        timeout: 15000,
        intervals: [250, 500, 1000],
      },
    )
    .toBe(1);
}

async function addCurrentListingToCartViaUi(page: import("@playwright/test").Page) {
  await page.getByTestId("listing-add-to-cart").click();

  await expect(page).toHaveURL(/\/listing\/.+-[0-9a-fA-F-]{36}$/, {
    timeout: 15000,
  });

  await waitForCartToContainLine(page);
}

async function seedCartLineViaBff(page: import("@playwright/test").Page) {
  const bootstrap = await page.request.get("http://localhost:3005/api/bff/cart");
  expect(bootstrap.ok()).toBeTruthy();

  const setCookieHeader = bootstrap.headers()["set-cookie"];
  const match = setCookieHeader?.match(/mk_cart_id=([^;]+)/);
  expect(match?.[1]).toBeTruthy();

  const cartId = match![1];

  await page.context().addCookies([
    {
      name: "mk_cart_id",
      value: cartId,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);

  const addRes = await page.request.put("http://localhost:3005/api/bff/cart", {
    headers: {
      cookie: `mk_cart_id=${cartId}`,
      "content-type": "application/json",
    },
    data: {
      offerId: RAINBOW_OFFER_ID,
      quantity: 1,
    },
  });

  expect(addRes.ok()).toBeTruthy();

  await waitForCartToContainLine(page);
}

test.beforeEach(async ({ request }) => {
  await reseedBackend(request);
});

test("guest add to cart persists across refresh and shows warning", async ({ page }) => {
  await page.goto(RAINBOW_LISTING_URL, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByTestId("listing-detail-page")).toBeVisible();
  await expect(page.getByTestId("listing-add-to-cart")).toBeVisible();

  await addCurrentListingToCartViaUi(page);

  await page.goto("/cart", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId("cart-page")).toBeVisible();
  await expect(page.getByTestId("cart-warning-banner")).toBeVisible();
  await expect(page.getByTestId("cart-line")).toHaveCount(1, { timeout: 15000 });

  await page.reload();

  await expect(page.getByTestId("cart-page")).toBeVisible();
  await expect(page.getByTestId("cart-warning-banner")).toBeVisible();
  await expect(page.getByTestId("cart-line")).toHaveCount(1, { timeout: 15000 });
});

test("guest can remove a cart line", async ({ page }) => {
  await seedCartLineViaBff(page);

  await page.goto("/cart", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId("cart-line")).toHaveCount(1, { timeout: 15000 });

  await page.getByTestId("cart-remove-button").first().click();

  await expect(page.getByTestId("cart-line")).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByTestId("cart-empty-state")).toBeVisible();
});

test("empty cart page renders cleanly", async ({ page }) => {
  await page.goto("/cart", { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("cart-page")).toBeVisible();

  const lineCount = await page.getByTestId("cart-line").count();
  if (lineCount === 0) {
    await expect(page.getByTestId("cart-empty-state")).toBeVisible();
  }
});