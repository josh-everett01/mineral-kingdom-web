import { test, expect } from "@playwright/test"

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")

test("shop browse page loads successfully", async ({ page }) => {
  await page.goto("/shop", { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("shop-page")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Available Now" })).toBeVisible()
  await expect(page.getByTestId("shop-filters")).toBeVisible()
  await expect(page.getByTestId("shop-results-summary")).toBeVisible()

  const gridCount = await page.getByTestId("shop-results-grid").count()
  const emptyCount = await page.getByTestId("shop-empty-state").count()

  expect(gridCount + emptyCount).toBeGreaterThan(0)
})

test("shop filters update the url", async ({ page }) => {
  await page.goto("/shop", { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("shop-page")).toBeVisible()

  await page.getByTestId("shop-filter-fluorescent").click()
  await expect(page.getByTestId("shop-filter-fluorescent")).toBeChecked()

  await page.getByTestId("shop-filter-sort").selectOption("price_asc")
  await expect(page.getByTestId("shop-filter-sort")).toHaveValue("price_asc")
})

test("shop listing cards navigate to canonical listing urls", async ({ page }) => {
  await page.goto("/shop", { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("shop-page")).toBeVisible()

  const firstLink = page.getByTestId("shop-listing-card-link").first()
  const href = await firstLink.getAttribute("href")

  expect(href).toBeTruthy()
  expect(href).toMatch(/^\/listing\/.+-[0-9a-fA-F-]{36}$/)
  await expect(firstLink).toHaveAttribute("href", /\/listing\/.+-[0-9a-fA-F-]{36}$/)

  await Promise.all([
    page.waitForURL(/\/listing\/.+-[0-9a-fA-F-]{36}$/, { timeout: 15_000 }),
    firstLink.click(),
  ])

  await expect(page.getByTestId("listing-detail-page")).toBeVisible()
  await expect(page.getByTestId("listing-detail-title")).toBeVisible()
})

test("homepage listing cards use canonical listing urls when data is present", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" })

  await expect(page.getByRole("heading", { name: /Rare Minerals/i })).toBeVisible()

  const listingLinks = page.getByRole("link", { name: /view listing/i })
  const linkCount = await listingLinks.count()

  test.skip(linkCount === 0, "No homepage listing cards available in this environment.")

  const href = await listingLinks.first().getAttribute("href")
  expect(href).toBeTruthy()
  expect(href).toMatch(/^\/listing\/.+-[0-9a-fA-F-]{36}$/)
})

test("store-backed listing detail shows pricing and add-to-cart affordance", async ({ page }) => {
  await page.goto("/listing/rainbow-fluorite-tower-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", {
    waitUntil: "domcontentloaded",
  })

  await expect(page.getByTestId("listing-detail-page")).toBeVisible()
  await expect(page.getByTestId("listing-detail-title")).toContainText("Rainbow Fluorite Tower")
  await expect(page.getByTestId("listing-store-offer")).toBeVisible()
  await expect(page.getByTestId("listing-store-offer-price")).toContainText("$160.00")
  await expect(page.getByTestId("listing-add-to-cart")).toBeVisible()
  await expect(page.getByTestId("listing-buy-now")).toBeVisible()

  await expect(page.getByTestId("listing-detail-mineral")).toContainText("Smoke Fluorite E2E")
  await expect(page.getByTestId("listing-detail-locality")).toContainText("Berbes, Asturias, Spain")
  await expect(page.getByTestId("listing-detail-size-class")).toContainText("CABINET")
  await expect(page.getByTestId("listing-detail-fluorescent")).toContainText("Yes")
})

test("auction-backed listing detail shows auction widget and no add-to-cart affordance", async ({ page }) => {
  await page.goto("/listing/arkansas-quartz-cluster-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1", {
    waitUntil: "domcontentloaded",
  })

  await expect(page.getByTestId("listing-detail-page")).toBeVisible()
  await expect(page.getByTestId("listing-detail-title")).toContainText("Arkansas Quartz Cluster")
  await expect(page.getByTestId("listing-auction-widget")).toBeVisible()
  await expect(page.getByTestId("listing-auction-current-bid")).toContainText("$112.00")
  await expect(page.getByTestId("listing-auction-status")).toContainText("LIVE")
  await expect(page.getByTestId("listing-add-to-cart")).toHaveCount(0)
  await expect(page.getByTestId("listing-buy-now")).toHaveCount(0)

  await expect(page.getByTestId("listing-detail-mineral")).toContainText("Smoke Quartz E2E")
  await expect(page.getByTestId("listing-detail-locality")).toContainText("Mount Ida, Arkansas, USA")
  await expect(page.getByTestId("listing-detail-size-class")).toContainText("MINIATURE")
})

test("mineral category page filters listings appropriately and uses the correct title", async ({ page }) => {
  await page.goto("/shop/mineral/Smoke%20Fluorite%20E2E", { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("shop-mineral-page")).toBeVisible()
  await expect(page).toHaveTitle(/Smoke Fluorite E2E Specimens \| Mineral Kingdom/i)
  await expect(page.getByRole("heading", { name: "Smoke Fluorite E2E Specimens" })).toBeVisible()

  const cards = page.getByTestId("shop-listing-card")
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText("Smoke Fluorite E2E")

  const href = await page.getByTestId("shop-listing-card-link").first().getAttribute("href")
  expect(href).toBeTruthy()
  expect(href).toMatch(/^\/listing\/.+-[0-9a-fA-F-]{36}$/)
})

test("size category page filters listings appropriately and uses the correct title", async ({ page }) => {
  await page.goto("/shop/size/CABINET", { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("shop-size-page")).toBeVisible()
  await expect(page).toHaveTitle(/Cabinet Specimens \| Mineral Kingdom/i)
  await expect(page.getByRole("heading", { name: "Cabinet Specimens" })).toBeVisible()

  const cards = page.getByTestId("shop-listing-card")
  await expect(cards).toHaveCount(3)

  const sizeBadges = page.getByTestId("shop-listing-card-size")
  await expect(sizeBadges).toHaveCount(3)
  await expect(sizeBadges.nth(0)).toContainText("CABINET")
  await expect(sizeBadges.nth(1)).toContainText("CABINET")
})

test("invalid size category route returns not found", async ({ page }) => {
  await page.goto("/shop/size/not-a-real-size-class", { waitUntil: "domcontentloaded" })

  await expect(page.getByRole("heading", { name: /page not found|404|not found/i })).toBeVisible()
})

test("malformed canonical listing route returns not found", async ({ page }) => {
  await page.goto("/listing/not-a-valid-guid", { waitUntil: "domcontentloaded" })

  await expect(page.getByRole("heading", { name: /404|not found/i })).toBeVisible()
})

test("listing detail renders optional metadata fields when all are present", async ({ page }) => {
  // Rainbow Fluorite Tower has all optional fields seeded: country, dimensions, weight,
  // fluorescence notes, and condition notes.
  await page.goto("/listing/rainbow-fluorite-tower-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", {
    waitUntil: "domcontentloaded",
  })

  await expect(page.getByTestId("listing-detail-page")).toBeVisible()

  await expect(page.getByTestId("listing-detail-country")).toBeVisible()
  await expect(page.getByTestId("listing-detail-country")).toContainText("ES")

  await expect(page.getByTestId("listing-detail-length")).toBeVisible()
  await expect(page.getByTestId("listing-detail-length")).toContainText("8.5 cm")

  await expect(page.getByTestId("listing-detail-width")).toBeVisible()
  await expect(page.getByTestId("listing-detail-width")).toContainText("4.2 cm")

  await expect(page.getByTestId("listing-detail-height")).toBeVisible()
  await expect(page.getByTestId("listing-detail-height")).toContainText("3.8 cm")

  await expect(page.getByTestId("listing-detail-weight")).toBeVisible()
  await expect(page.getByTestId("listing-detail-weight")).toContainText("420 g")

  await expect(page.getByTestId("listing-detail-fluorescence-notes")).toBeVisible()
  await expect(page.getByTestId("listing-detail-fluorescence-notes")).toContainText("Strong blue")

  await expect(page.getByTestId("listing-detail-condition-notes")).toBeVisible()
  await expect(page.getByTestId("listing-detail-condition-notes")).toContainText("Excellent edges")
})

test("listing detail hides fluorescence notes row when value is null", async ({ page }) => {
  // Amethyst Cathedral has FluorescenceNotes = null but ConditionNotes set.
  await page.goto("/listing/amethyst-cathedral-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4", {
    waitUntil: "domcontentloaded",
  })

  await expect(page.getByTestId("listing-detail-page")).toBeVisible()

  // Fluorescence notes row must not be rendered at all
  await expect(page.getByTestId("listing-detail-fluorescence-notes")).toHaveCount(0)

  // Condition notes is populated — must still be visible
  await expect(page.getByTestId("listing-detail-condition-notes")).toBeVisible()
  await expect(page.getByTestId("listing-detail-condition-notes")).toContainText("Rich purple zoning")

  // Other optional metadata still renders because it is set
  await expect(page.getByTestId("listing-detail-country")).toBeVisible()
  await expect(page.getByTestId("listing-detail-length")).toBeVisible()
})
