import { test, expect } from "@playwright/test"

const AUCTION_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3"

function buildAuctionDetailMock(overrides: Record<string, unknown> = {}) {
  return {
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
    quotedShippingCents: null,
    shippingMessage: null,
    shippingRates: [],
    bidHistory: [],
    media: [
      {
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
        url: "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?auto=format&fit=crop&w=1200&q=80",
        mediaType: "IMAGE",
        caption: null,
        isPrimary: true,
        sortOrder: 0,
      },
    ],
    isCurrentUserLeading: null,
    hasCurrentUserBid: null,
    currentUserMaxBidCents: null,
    currentUserBidState: null,
    hasPendingDelayedBid: null,
    currentUserDelayedBidCents: null,
    currentUserDelayedBidStatus: null,
    isCurrentUserWinner: null,
    paymentOrderId: null,
    paymentVisibilityState: null,
    ...overrides,
  }
}

test("auction detail happy path renders public auction information", async ({ page }) => {
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

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
    console.log("mocked auction detail route hit:", route.request().url())
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildAuctionDetailMock({
          quotedShippingCents: 2500,
        }),
      )
    })
  })

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

test("auction detail shows quoted shipping guidance when shipping quote is present", async ({ page }) => {
  page.on("console", (msg) => {
    console.log(`[browser:${msg.type()}] ${msg.text()}`)
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
    console.log("mocked auction detail route hit:", route.request().url())
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildAuctionDetailMock({
          quotedShippingCents: 2500,
        }),
      )
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-shipping-card")).toBeVisible()
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

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildAuctionDetailMock())
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-page")).toBeVisible()
  await expect(page.getByTestId("auction-detail-bidding-guest")).toBeVisible()
  await expect(page.getByText(/sign in to place a max bid/i)).toBeVisible()
  await expect(page.getByTestId("auction-detail-leading-state")).toHaveCount(0)
  await expect(page.getByTestId("auction-detail-outbid-state")).toHaveCount(0)
  await expect(page.getByTestId("auction-detail-delayed-scheduled-state")).toHaveCount(0)
  await expect(page.getByTestId("auction-detail-winner-payment-due")).toHaveCount(0)
  await expect(page.getByTestId("auction-detail-closed-non-winner")).toHaveCount(0)
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

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildAuctionDetailMock({
          isCurrentUserLeading: true,
          hasCurrentUserBid: true,
          currentUserMaxBidCents: 21000,
          currentUserBidState: "LEADING",
        }),
      )
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
          id: "11111111-1111-1111-1111-111111111111",
          email: "outbid@example.com",
        },
        roles: [],
      })
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildAuctionDetailMock({
          currentPriceCents: 22000,
          bidCount: 3,
          minimumNextBidCents: 22500,
          isCurrentUserLeading: false,
          hasCurrentUserBid: true,
          currentUserMaxBidCents: 21000,
          currentUserBidState: "OUTBID",
          hasPendingDelayedBid: false,
          currentUserDelayedBidCents: null,
          currentUserDelayedBidStatus: "NONE",
          isCurrentUserWinner: false,
          paymentVisibilityState: "NONE",
        }),
      )
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-page")).toBeVisible()
  await expect(page.getByTestId("auction-detail-outbid-state")).toBeVisible()
  await expect(page.getByText(/you’ve been outbid/i)).toBeVisible()
  await expect(page.getByTestId("auction-detail-current-max-bid")).toContainText("$210.00")
})

test("signed-in delayed bidder sees scheduled delayed panel", async ({ page }) => {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        emailVerified: true,
        user: {
          id: "99999999-9999-9999-9999-999999999999",
          email: "delayed-pending@example.com",
        },
        roles: [],
      }),
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildAuctionDetailMock({
          currentPriceCents: 10000,
          bidCount: 0,
          reserveMet: false,
          minimumNextBidCents: 10000,
          hasCurrentUserBid: true,
          hasPendingDelayedBid: true,
          currentUserDelayedBidCents: 20000,
          currentUserDelayedBidStatus: "SCHEDULED",
        }),
      )
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-delayed-scheduled-state")).toBeVisible()
  await expect(page.getByText(/your delayed bid is scheduled/i)).toBeVisible()
  await expect(page.getByText(/will activate when the auction enters closing/i)).toBeVisible()
  await expect(page.getByTestId("auction-detail-delayed-scheduled-state")).toContainText(
    /immediate max bids are active now/i,
  )
  await expect(page.getByTestId("auction-detail-delayed-scheduled-state")).toContainText(
    /place immediate bids while your delayed bid remains scheduled/i,
  )
  await expect(page.getByTestId("auction-detail-delayed-bid-amount")).toContainText("$200.00")
  await expect(page.getByTestId("auction-detail-outbid-state")).toHaveCount(0)
})

test("signed-in bidder sees moot delayed bid panel when delayed bid is no longer needed", async ({ page }) => {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        emailVerified: true,
        user: {
          id: "99999999-9999-9999-9999-999999999999",
          email: "delayed-moot@example.com",
        },
        roles: [],
      }),
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildAuctionDetailMock({
          currentPriceCents: 23000,
          bidCount: 4,
          minimumNextBidCents: 23500,
          isCurrentUserLeading: false,
          hasCurrentUserBid: true,
          currentUserMaxBidCents: null,
          currentUserBidState: "NONE",
          hasPendingDelayedBid: true,
          currentUserDelayedBidCents: 20000,
          currentUserDelayedBidStatus: "MOOT",
          isCurrentUserWinner: false,
          paymentVisibilityState: "NONE",
        }),
      )
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-delayed-moot-state")).toBeVisible()
  await expect(page.getByText(/your delayed bid is no longer needed/i)).toBeVisible()
  await expect(page.getByTestId("auction-detail-delayed-bid-amount")).toContainText("$200.00")
})

test("signed-in bidder sees activated delayed bid panel", async ({ page }) => {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        emailVerified: true,
        user: {
          id: "99999999-9999-9999-9999-999999999999",
          email: "delayed-activated@example.com",
        },
        roles: [],
      }),
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildAuctionDetailMock({
          status: "CLOSING",
          currentPriceCents: 20000,
          bidCount: 3,
          minimumNextBidCents: 20500,
          isCurrentUserLeading: true,
          hasCurrentUserBid: true,
          currentUserMaxBidCents: 20000,
          currentUserBidState: "LEADING",
          hasPendingDelayedBid: true,
          currentUserDelayedBidCents: 20000,
          currentUserDelayedBidStatus: "ACTIVATED",
          isCurrentUserWinner: false,
          paymentVisibilityState: "NONE",
        }),
      )
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-delayed-activated-state")).toBeVisible()
  await expect(page.getByText(/your delayed bid has activated/i)).toBeVisible()
  await expect(page.getByTestId("auction-detail-delayed-bid-amount")).toContainText("$200.00")
})

test("winner sees pay now CTA for closed auction awaiting payment", async ({ page }) => {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        emailVerified: true,
        user: {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          email: "winner@example.com",
        },
        roles: [],
      }),
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildAuctionDetailMock({
          status: "CLOSED_WAITING_ON_PAYMENT",
          currentPriceCents: 24500,
          bidCount: 6,
          currentUserMaxBidCents: 25000,
          hasCurrentUserBid: true,
          isCurrentUserWinner: true,
          paymentOrderId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
          paymentVisibilityState: "PAYMENT_DUE",
        }),
      )
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-winner-payment-due")).toBeVisible()
  await expect(page.getByText(/you won this auction/i)).toBeVisible()
  await expect(page.getByTestId("auction-detail-pay-now")).toBeVisible()
  await expect(page.getByTestId("auction-detail-bidding-panel")).toHaveCount(0)
})

test("non-winner does not see pay now CTA for closed auction", async ({ page }) => {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        emailVerified: true,
        user: {
          id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
          email: "nonwinner@example.com",
        },
        roles: [],
      }),
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildAuctionDetailMock({
          status: "CLOSED_WAITING_ON_PAYMENT",
          currentPriceCents: 24500,
          bidCount: 6,
          minimumNextBidCents: 25000,
          isCurrentUserLeading: false,
          hasCurrentUserBid: true,
          currentUserMaxBidCents: 24000,
          currentUserBidState: "NONE",
          hasPendingDelayedBid: false,
          currentUserDelayedBidCents: null,
          currentUserDelayedBidStatus: "NONE",
          isCurrentUserWinner: false,
          paymentVisibilityState: "NONE",
        }),
      )
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-closed-non-winner")).toBeVisible()
  await expect(page.getByTestId("auction-detail-pay-now")).toHaveCount(0)
  await expect(page.getByTestId("auction-detail-bidding-panel")).toHaveCount(0)
})

test("winner paid sees view order CTA instead of pay now", async ({ page }) => {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        emailVerified: true,
        user: {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          email: "winner@example.com",
        },
        roles: [],
      })
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildAuctionDetailMock({
          status: "CLOSED_PAID",
          currentPriceCents: 24500,
          bidCount: 6,
          minimumNextBidCents: 25000,
          isCurrentUserLeading: false,
          hasCurrentUserBid: true,
          currentUserMaxBidCents: 25000,
          currentUserBidState: "NONE",
          hasPendingDelayedBid: false,
          currentUserDelayedBidCents: null,
          currentUserDelayedBidStatus: "NONE",
          isCurrentUserWinner: true,
          paymentOrderId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
          paymentVisibilityState: "PAID",
        }),
      )
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-winner-paid")).toBeVisible()
  await expect(page.getByTestId("auction-detail-view-order")).toBeVisible()
  await expect(page.getByTestId("auction-detail-pay-now")).toHaveCount(0)
})

test("winner pay now CTA points to the order-owned payment page", async ({ page }) => {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        emailVerified: true,
        user: {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          email: "winner@example.com",
        },
        roles: [],
      }),
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildAuctionDetailMock({
          status: "CLOSED_WAITING_ON_PAYMENT",
          currentPriceCents: 24500,
          bidCount: 6,
          minimumNextBidCents: 25000,
          isCurrentUserLeading: false,
          hasCurrentUserBid: true,
          currentUserMaxBidCents: 25000,
          currentUserBidState: "NONE",
          hasPendingDelayedBid: false,
          currentUserDelayedBidCents: null,
          currentUserDelayedBidStatus: "NONE",
          isCurrentUserWinner: true,
          paymentOrderId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
          paymentVisibilityState: "PAYMENT_DUE",
        }),
      )
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  const payNow = page.getByTestId("auction-detail-pay-now")
  await expect(payNow).toBeVisible()

  await payNow.click()

  await page.waitForURL((url) =>
    url.pathname === "/orders/cccccccc-cccc-cccc-cccc-cccccccccccc",
  )
})

test("submit max bid opens confirmation dialog and refreshes detail after confirm", async ({ page }) => {
  let bidSubmitted = false

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

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
    if (!bidSubmitted) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildAuctionDetailMock({
            isCurrentUserLeading: false,
            hasCurrentUserBid: false,
            currentUserBidState: "NONE",
            hasPendingDelayedBid: false,
            currentUserDelayedBidCents: null,
            currentUserDelayedBidStatus: "NONE",
            isCurrentUserWinner: false,
            paymentVisibilityState: "NONE",
          }),
        )
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildAuctionDetailMock({
          currentPriceCents: 16000,
          minimumNextBidCents: 16500,
          isCurrentUserLeading: true,
          hasCurrentUserBid: true,
          currentUserMaxBidCents: 16000,
          currentUserBidState: "LEADING",
          hasPendingDelayedBid: false,
          currentUserDelayedBidCents: null,
          currentUserDelayedBidStatus: "NONE",
          isCurrentUserWinner: false,
          paymentVisibilityState: "NONE",
        }),
      )
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}/bids*`, async (route) => {
    bidSubmitted = true

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

test("delayed mode changes helper copy and submits delayed bid", async ({ page }) => {
  let detailCallCount = 0

  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        emailVerified: true,
        user: {
          id: "77777777-7777-7777-7777-777777777777",
          email: "delayed@example.com",
        },
        roles: [],
      }),
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
    detailCallCount += 1

    if (detailCallCount <= 2) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          buildAuctionDetailMock({
            currentPriceCents: 20000,
            bidCount: 2,
            minimumNextBidCents: 20500,
            isCurrentUserLeading: false,
            hasCurrentUserBid: false,
            currentUserBidState: "NONE",
            hasPendingDelayedBid: false,
            currentUserDelayedBidCents: null,
            currentUserDelayedBidStatus: "NONE",
            isCurrentUserWinner: false,
            paymentVisibilityState: "NONE",
          }),
        )
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildAuctionDetailMock({
          currentPriceCents: 20000,
          bidCount: 2,
          minimumNextBidCents: 20500,
          isCurrentUserLeading: false,
          hasCurrentUserBid: false,
          currentUserBidState: "NONE",
          hasPendingDelayedBid: false,
          currentUserDelayedBidCents: null,
          currentUserDelayedBidStatus: "NONE",
          isCurrentUserWinner: false,
          paymentVisibilityState: "NONE",
        }),
      )
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}/bids*`, async (route) => {
    const request = route.request()
    const body = request.postDataJSON() as { maxBidCents: number; mode: string }

    expect(body.maxBidCents).toBe(22000)
    expect(body.mode).toBe("DELAYED")

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildAuctionDetailMock({
          currentPriceCents: 20000,
          bidCount: 2,
          minimumNextBidCents: 20500,
          isCurrentUserLeading: false,
          hasCurrentUserBid: true,
          currentUserBidState: "NONE",
          hasPendingDelayedBid: true,
          currentUserDelayedBidCents: 22000,
          currentUserDelayedBidStatus: "SCHEDULED",
          isCurrentUserWinner: false,
          paymentVisibilityState: "NONE",
        }),
      )
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-bidding-panel")).toBeVisible()

  await page.getByTestId("auction-detail-bid-mode-delayed").check()
  await expect(page.getByTestId("auction-detail-bid-mode-help")).toContainText(
    /activate when the auction enters closing/i,
  )
  await expect(page.getByTestId("auction-detail-bid-mode-help")).toContainText(
    /at least 3 hours before close/i,
  )
  await expect(page.getByTestId("auction-detail-bid-mode-help")).toContainText(
    /replaces your previous delayed bid/i,
  )
  await expect(page.getByTestId("auction-detail-bid-mode-help")).toContainText(
    /cancel a delayed bid before it activates/i,
  )
  await expect(page.getByTestId("auction-detail-bid-mode-help")).toContainText(
    /immediate max bids are active now/i,
  )
  await expect(page.getByTestId("auction-detail-bid-mode-help")).toContainText(
    /place immediate bids while your delayed bid remains scheduled/i,
  )

  await page.getByTestId("auction-detail-bid-input").fill("220")
  await page.getByTestId("auction-detail-bid-submit").click()

  await expect(page.getByTestId("auction-detail-bid-confirm-dialog")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Confirm delayed max bid" }),
  ).toBeVisible()

  await page.getByTestId("auction-detail-bid-confirm-submit").click()

  await expect(page.getByTestId("auction-detail-bid-success")).toBeVisible()
  await expect(page.getByTestId("auction-detail-bid-success")).toContainText(
    /delayed max bid was submitted successfully/i,
  )
})

test("cancel delayed bid refreshes detail", async ({ page }) => {
  let delayedBidCancelled = false

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
        accessTokenExpiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 60 * 10,
      }),
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
    const body = delayedBidCancelled
      ? buildAuctionDetailMock({
        isCurrentUserLeading: false,
        hasCurrentUserBid: false,
        currentUserBidState: "NONE",
        hasPendingDelayedBid: false,
        currentUserDelayedBidCents: null,
        currentUserDelayedBidStatus: "NONE",
        isCurrentUserWinner: false,
        paymentVisibilityState: "NONE",
      })
      : buildAuctionDetailMock({
        isCurrentUserLeading: false,
        hasCurrentUserBid: false,
        currentUserBidState: "NONE",
        hasPendingDelayedBid: true,
        currentUserDelayedBidCents: 17000,
        currentUserDelayedBidStatus: "SCHEDULED",
        isCurrentUserWinner: false,
        paymentVisibilityState: "NONE",
      })

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  })

  await page.route(`**/api/bff/auctions/${AUCTION_ID}/delayed-bid`, async (route) => {
    delayedBidCancelled = true

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    })
  })

  await page.goto(`/auctions/${AUCTION_ID}`, { waitUntil: "domcontentloaded" })

  await expect(page.getByTestId("auction-detail-bid-existing-delayed")).toBeVisible()
  await expect(page.getByTestId("auction-detail-cancel-delayed-bid")).toBeVisible()

  await page.getByTestId("auction-detail-cancel-delayed-bid").click()

  await expect(page.getByTestId("auction-detail-bid-success")).toContainText(
    /delayed bid was cancelled successfully|cancelled/i,
  )
  await expect(page.getByTestId("auction-detail-bid-existing-delayed")).toBeHidden()
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

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
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
  await expect(page.getByRole("heading", { name: "Your session expired" })).toBeVisible()
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

  await page.route(`**/api/bff/auctions/${AUCTION_ID}*`, async (route) => {
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