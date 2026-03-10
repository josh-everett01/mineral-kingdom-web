import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).");

const routes = [
  "/about",
  "/faq",
  "/terms",
  "/privacy",
  "/auction-rules",
  "/buying-rules",
] as const;

for (const route of routes) {
  test(`public page ${route} renders published CMS content`, async ({ page }) => {
    await page.goto(route);

    await expect(page).toHaveURL(new RegExp(`${route.replace(/\//g, "\\/")}$`));
    await expect(page.getByTestId("public-page-title")).toBeVisible();
    await expect(page.getByTestId("public-page-content")).toBeVisible();
  });
}