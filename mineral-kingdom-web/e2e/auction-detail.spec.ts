import { test, expect } from "@playwright/test"

const AUCTION_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3"

test("auction detail happy path renders public auction information", async ({ page }) => {
  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-page")).toBeVisible()
  await expect(page.getByTestId("auction-detail-title")).toContainText("Arkansas Quartz Cluster")
  await expect(page.getByTestId("auction-detail-status")).toContainText("LIVE")
  await expect(page.getByTestId("auction-detail-media")).toBeVisible()
  await expect(page.getByTestId("auction-detail-description")).toBeVisible()
  await expect(page.getByTestId("auction-detail-price")).toBeVisible()
  await expect(page.getByTestId("auction-detail-price")).toContainText(/\$\d+\.\d{2}/)
  await expect(page.getByTestId("auction-detail-closing-time")).toBeVisible()
})

test("auction detail renders not-found state cleanly", async ({ page }) => {
  const auctionId = "00000000-0000-0000-0000-000000000000"

  await page.goto(`/auctions/${auctionId}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-not-found")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Auction not found" })).toBeVisible()
})

test("guest sees max-bid messaging instead of member status", async ({ page }) => {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: false,
        user: null,
        roles: [],
      }),
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-page")).toBeVisible()
  await expect(page.getByTestId("auction-detail-bidding-guest")).toBeVisible()
  await expect(page.getByText(/sign in to place a max bid/i)).toBeVisible()
  await expect(page.getByTestId("auction-detail-leading-state")).toHaveCount(0)
  await expect(page.getByTestId("auction-detail-outbid-state")).toHaveCount(0)
})

test("signed-in returning leader sees winning banner and current max bid", async ({ page }) => {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        emailVerified: true,
        user: {
          id: "11111111-1111-1111-1111-111111111111",
          email: "leader@example.com",
        },
        roles: [],
      }),
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        auctionId: AUCTION_ID,
        listingId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
        title: "Arkansas Quartz Cluster",
        description: "Deterministic E2E auction listing fixture.",
        status: "LIVE",
        currentPriceCents: 15500,
        bidCount: 2,
        reserveMet: true,
        closingTimeUtc: "2026-03-24T15:25:36.513561+00:00",
        minimumNextBidCents: 16000,
        media: [
          {
            id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
            url: "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?auto=format&fit=crop&w=1200&q=80",
            isPrimary: true,
            sortOrder: 0,
          },
        ],
        isCurrentUserLeading: true,
        hasCurrentUserBid: true,
        currentUserMaxBidCents: 21000,
      }),
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-page")).toBeVisible()
  await expect(page.getByTestId("auction-detail-leading-state")).toBeVisible()
  await expect(page.getByText(/you’re currently winning/i)).toBeVisible()
  await expect(page.getByTestId("auction-detail-current-max-bid")).toContainText("$210.00")
})

test("signed-in returning bidder sees outbid banner and current max bid", async ({ page }) => {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        emailVerified: true,
        user: {
          id: "22222222-2222-2222-2222-222222222222",
          email: "outbid@example.com",
        },
        roles: [],
      }),
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        auctionId: AUCTION_ID,
        listingId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
        title: "Arkansas Quartz Cluster",
        description: "Deterministic E2E auction listing fixture.",
        status: "LIVE",
        currentPriceCents: 22000,
        bidCount: 3,
        reserveMet: true,
        closingTimeUtc: "2026-03-24T15:25:36.513561+00:00",
        minimumNextBidCents: 22500,
        media: [
          {
            id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
            url: "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?auto=format&fit=crop&w=1200&q=80",
            isPrimary: true,
            sortOrder: 0,
          },
        ],
        isCurrentUserLeading: false,
        hasCurrentUserBid: true,
        currentUserMaxBidCents: 21000,
      }),
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-page")).toBeVisible()
  await expect(page.getByTestId("auction-detail-outbid-state")).toBeVisible()
  await expect(page.getByText(/you’ve been outbid/i)).toBeVisible()
  await expect(page.getByTestId("auction-detail-current-max-bid")).toContainText("$210.00")
})

test("submit max bid opens confirmation dialog and refreshes detail after confirm", async ({ page }) => {
  let detailCallCount = 0

  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        emailVerified: true,
        user: {
          id: "33333333-3333-3333-3333-333333333333",
          email: "bidder@example.com",
        },
        roles: [],
      }),
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}`, async (route) => {
    detailCallCount += 1

    if (detailCallCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          auctionId: AUCTION_ID,
          listingId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
          title: "Arkansas Quartz Cluster",
          description: "Deterministic E2E auction listing fixture.",
          status: "LIVE",
          currentPriceCents: 15500,
          bidCount: 2,
          reserveMet: true,
          closingTimeUtc: "2026-03-24T15:25:36.513561+00:00",
          minimumNextBidCents: 16000,
          media: [
            {
              id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
              url: "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?auto=format&fit=crop&w=1200&q=80",
              isPrimary: true,
              sortOrder: 0,
            },
          ],
          isCurrentUserLeading: false,
          hasCurrentUserBid: false,
          currentUserMaxBidCents: null,
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        auctionId: AUCTION_ID,
        listingId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
        title: "Arkansas Quartz Cluster",
        description: "Deterministic E2E auction listing fixture.",
        status: "LIVE",
        currentPriceCents: 16000,
        bidCount: 2,
        reserveMet: true,
        closingTimeUtc: "2026-03-24T15:25:36.513561+00:00",
        minimumNextBidCents: 16500,
        media: [
          {
            id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
            url: "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?auto=format&fit=crop&w=1200&q=80",
            isPrimary: true,
            sortOrder: 0,
          },
        ],
        isCurrentUserLeading: true,
        hasCurrentUserBid: true,
        currentUserMaxBidCents: 16000,
      }),
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}/bids`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        currentPriceCents: 16000,
        leaderUserId: "33333333-3333-3333-3333-333333333333",
        hasReserve: true,
        reserveMet: true,
      }),
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-bidding-panel")).toBeVisible()

  await page.getByTestId("auction-detail-bid-input").fill("160")
  await page.getByTestId("auction-detail-bid-submit").click()

  await expect(page.getByTestId("auction-detail-bid-confirm-dialog")).toBeVisible()
  await expect(page.getByText(/you are about to submit a max bid of/i)).toBeVisible()

  await page.getByTestId("auction-detail-bid-confirm-submit").click()

  await expect(page.getByTestId("auction-detail-bid-success")).toBeVisible()
  await expect(page.getByTestId("auction-detail-leading-state")).toBeVisible()
  await expect(page.getByTestId("auction-detail-current-max-bid")).toContainText("$160.00")
  await expect(page.getByTestId("auction-detail-activity")).toBeVisible()
  await expect(page.getByTestId("auction-detail-activity-list")).toBeVisible()
  await expect(page.getByText(/current bid increased to \$160\.00/i)).toBeVisible()
})

test("expired member detail shows sign-in-again panel and hides bid form", async ({ page }) => {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        emailVerified: true,
        user: {
          id: "55555555-5555-5555-5555-555555555555",
          email: "expired@example.com",
        },
        roles: [],
      }),
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}`, async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        status: 401,
        code: "AUTH_EXPIRED",
        message: "Your session expired. Please sign in again.",
      }),
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-session-expired")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Your session expired" }),
  ).toBeVisible()
  await expect(page.getByTestId("auction-detail-sign-in-again")).toBeVisible()
  await expect(page.getByTestId("auction-detail-bidding-panel")).toHaveCount(0)
})

test("sign in again uses returnTo auction param", async ({ page }) => {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        emailVerified: true,
        user: {
          id: "66666666-6666-6666-6666-666666666666",
          email: "expired@example.com",
        },
        roles: [],
      }),
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}`, async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        status: 401,
        code: "AUTH_EXPIRED",
        message: "Your session expired. Please sign in again.",
      }),
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await page.getByTestId("auction-detail-sign-in-again").click()
  await expect(page).toHaveURL(new RegExp(`/login\\?returnTo=%2Fauctions%2F${AUCTION_ID}`))
})