import { test, expect } from "@playwright/test";

test.skip(!!process.env.CI, "Cart bridge e2e requires API/DB running locally");

test("cart proxy persists X-Cart-Id and maintains continuity", async ({ request }) => {
  const res1 = await request.get("/api/bff/proxy/cart");
  expect(res1.ok()).toBeTruthy();

  const cartId1 = res1.headers()["x-cart-id"];
  expect(cartId1).toBeTruthy();

  const res2 = await request.get("/api/bff/proxy/cart");
  expect(res2.ok()).toBeTruthy();

  const cartId2 = res2.headers()["x-cart-id"];
  expect(cartId2).toBe(cartId1);
});