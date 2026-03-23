import { test, expect } from "@playwright/test"

test("auction detail happy path renders public auction information", async ({ page }) => {
  const auctionId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3"

  await page.goto(`/auctions/${auctionId}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-page")).toBeVisible()
  await expect(page.getByTestId("auction-detail-title")).toContainText("Arkansas Quartz Cluster")
  await expect(page.getByTestId("auction-detail-status")).toContainText("LIVE")
  await expect(page.getByTestId("auction-detail-media")).toBeVisible()
  await expect(page.getByTestId("auction-detail-description")).toBeVisible()
  await expect(page.getByTestId("auction-detail-price")).toContainText("$112.00")
  await expect(page.getByTestId("auction-detail-bid-count")).toContainText("4 bids")
  await expect(page.getByTestId("auction-detail-closing-time")).toBeVisible()
})

test("auction detail renders not-found state cleanly", async ({ page }) => {
  const auctionId = "00000000-0000-0000-0000-000000000000"

  await page.goto(`/auctions/${auctionId}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-not-found")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Auction not found" })).toBeVisible()
})

test("guest sees sign-in messaging instead of a bid form", async ({ page }) => {
  const auctionId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3"

  await page.goto(`/auctions/${auctionId}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-page")).toBeVisible()
  await expect(page.getByTestId("auction-detail-bidding-guest")).toBeVisible()
  await expect(page.getByText(/sign in to place an immediate bid/i)).toBeVisible()
})

test.skip(!process.env.E2E_BACKEND, "Requires backend running (set E2E_BACKEND=1).")
test("authenticated member can place an immediate bid", async ({ page }) => {
  // Replace this login flow with your real test login helper / seeded auth approach.
  // The important thing is to arrive authenticated before visiting the page.

  const auctionId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3"

  await page.goto("/login", { waitUntil: "domcontentloaded" })
  // TODO: perform your real login flow here

  await page.goto(`/auctions/${auctionId}`, { waitUntil: "domcontentloaded" })

  // This test assumes the authenticated state causes the bid panel to render.
  // If the current E2E environment does not have a reusable login helper yet,
  // keep this test pending until that helper is wired in.
  test.skip(true, "Wire authenticated E2E login helper for auction bidding flow.")

  await page.getByTestId("auction-detail-bid-input").fill("120")
  await page.getByTestId("auction-detail-bid-submit").click()

  await expect(page.getByTestId("auction-detail-bid-success")).toBeVisible()
})