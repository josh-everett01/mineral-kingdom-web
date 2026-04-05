import { test, expect } from "@playwright/test"

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")

test("auctions browse page loads successfully", async ({ page }) => {
  await page.goto("/auctions", { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auctions-page")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Browse auctions" })).toBeVisible()
  await expect(page.getByTestId("auctions-results-summary")).toBeVisible()

  const gridCount = await page.getByTestId("auctions-results-grid").count()
  const emptyCount = await page.getByTestId("auctions-empty-state").count()

  expect(gridCount + emptyCount).toBeGreaterThan(0)
})

test("auction browse cards expose auction detail route", async ({ page }) => {
  await page.goto("/auctions", { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auctions-page")).toBeVisible()

  const firstLink = page.getByTestId("auction-card-link").first()
  await expect(firstLink).toBeVisible()
  await expect(firstLink).toHaveAttribute("href", /\/auctions\/[0-9a-fA-F-]{36}$/)
})