import { expect, test, type Page } from "@playwright/test"

const LISTING_ID = "11111111-2222-3333-4444-555555555555"

function authMe(expiresInSeconds: number) {
  return {
    isAuthenticated: true,
    user: {
      id: "admin-session-renewal",
      email: "admin-session-renewal@example.com",
      displayName: "Session Renewal Admin",
    },
    roles: ["Admin"],
    accessTokenExpiresAtEpochSeconds: Math.floor(Date.now() / 1000) + expiresInSeconds,
  }
}

function listingDetail() {
  const now = new Date().toISOString()

  return {
    id: LISTING_ID,
    status: "DRAFT",
    title: "Session Renewal Draft",
    description: "Original listing description.",
    primaryMineralId: null,
    primaryMineralName: null,
    localityDisplay: null,
    countryCode: null,
    adminArea1: null,
    adminArea2: null,
    mineName: null,
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    weightGrams: null,
    sizeClass: null,
    isFluorescent: false,
    fluorescenceNotes: null,
    conditionNotes: null,
    isLot: false,
    quantityTotal: 1,
    quantityAvailable: 1,
    shippingRates: [],
    updatedAt: now,
    publishedAt: null,
    archivedAt: null,
    mediaSummary: {
      readyImageCount: 0,
      primaryReadyImageCount: 0,
      hasPrimaryVideoViolation: false,
    },
    publishChecklist: {
      canPublish: false,
      missing: ["PRIMARY_MINERAL", "IMAGE_REQUIRED"],
    },
  }
}

function mockJwt() {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(
    JSON.stringify({
      sub: "admin-session-renewal",
      email: "admin-session-renewal@example.com",
      role: "OWNER",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url")

  return `${header}.${payload}.signature`
}

async function mockAdminListingEditor(page: Page) {
  let refreshCalls = 0

  await page.context().addCookies([
    {
      name: "mk_access",
      value: mockJwt(),
      domain: "127.0.0.1",
      path: "/",
    },
    {
      name: "mk_refresh",
      value: "mock-refresh",
      domain: "127.0.0.1",
      path: "/",
    },
  ])

  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(authMe(122)),
    })
  })

  await page.route("**/api/bff/auth/refresh", async (route) => {
    refreshCalls += 1
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(authMe(3600)),
    })
  })

  await page.route(`**/api/bff/admin/listings/${LISTING_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(listingDetail()),
    })
  })

  await page.route(`**/api/bff/admin/listings/${LISTING_ID}/media`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    })
  })

  return {
    getRefreshCalls: () => refreshCalls,
  }
}

test("session warning renewal keeps admin listing edits on the current page", async ({ page }) => {
  const mocks = await mockAdminListingEditor(page)

  await page.goto(`/admin/listings/${LISTING_ID}`)
  await expect(page.getByTestId("admin-listing-editor-page")).toBeVisible()

  const unsavedTitle = "Still here after renewal"
  await page.getByTestId("admin-listing-title").fill(unsavedTitle)
  await expect(page.getByTestId("admin-listing-unsaved")).toBeVisible()

  await expect(page.getByTestId("session-expiry-dialog")).toBeVisible({ timeout: 5000 })

  await page.getByTestId("session-expiry-stay-signed-in").click()

  await expect(page.getByTestId("session-expiry-dialog")).toBeHidden({ timeout: 5000 })
  await expect(page).toHaveURL(new RegExp(`/admin/listings/${LISTING_ID}$`))
  await expect(page.getByTestId("admin-listing-title")).toHaveValue(unsavedTitle)
  expect(mocks.getRefreshCalls()).toBe(1)
})
