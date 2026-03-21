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

test("auction browse cards navigate to auction detail route", async ({ page }) => {
  await page.goto("/auctions", { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auctions-page")).toBeVisible()

  const linkCount = await page.getByTestId("auction-card-link").count()
  test.skip(linkCount === 0, "No auction cards available in this environment.")

  const firstLink = page.getByTestId("auction-card-link").first()
  const href = await firstLink.getAttribute("href")

  expect(href).toBeTruthy()
  expect(href).toMatch(/^\/auctions\/[0-9a-fA-F-]{36}$/)

  await firstLink.click()

  await expect(page).toHaveURL(/\/auctions\/[0-9a-fA-F-]{36}$/)
  await expect(page.getByTestId("auction-detail-page")).toBeVisible()
  await expect(page.getByTestId("auction-detail-id")).toBeVisible()
})