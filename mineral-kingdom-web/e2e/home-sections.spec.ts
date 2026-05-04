import { test, expect } from "@playwright/test"

test("homepage shows public discovery sections", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" })

  await expect(page.getByRole("heading", { name: /Rare Minerals/i })).toBeVisible()

  const homeText = page.locator("body")
  await expect(homeText).toContainText(/featured|new arrivals|auctions ending soon|upcoming auctions/i)
})

test("homepage can show upcoming auctions section", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" })

  await expect(page.getByRole("heading", { name: /Rare Minerals/i })).toBeVisible()

  const hasUpcomingSection =
    (await page.getByTestId("home-section-upcoming-auctions").count()) > 0

  const hasEndingSoonSection =
    (await page.getByTestId("home-section-auctions-ending-soon").count()) > 0

  expect(hasUpcomingSection || hasEndingSoonSection).toBeTruthy()
})
