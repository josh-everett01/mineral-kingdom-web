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
  await expect(page.getByTestId("auction-detail-bidding-placeholder")).toBeVisible()
})

test("auction detail renders not-found state cleanly", async ({ page }) => {
  const auctionId = "00000000-0000-0000-0000-000000000000"

  await page.goto(`/auctions/${auctionId}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-not-found")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Auction not found" })).toBeVisible()
})