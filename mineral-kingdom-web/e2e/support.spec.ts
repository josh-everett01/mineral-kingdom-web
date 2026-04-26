import { test, expect, type Page, type Response } from "@playwright/test"

test.describe.configure({ mode: "serial" })

// ---------------------------------------------------------------------------
// Env / fixture config
// ---------------------------------------------------------------------------

const hasMemberFixture =
  !!process.env.E2E_MEMBER_EMAIL && !!process.env.E2E_MEMBER_PASSWORD
const hasAdminFixture =
  !!process.env.E2E_ADMIN_EMAIL && !!process.env.E2E_ADMIN_PASSWORD

const ORDER_ID =
  process.env.E2E_SUPPORT_ORDER_ID ?? "a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const SHIPPING_INVOICE_ID =
  process.env.E2E_SUPPORT_SHIPPING_INVOICE_ID ?? "b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

// ---------------------------------------------------------------------------
// Helpers – mock API
// ---------------------------------------------------------------------------

function buildAuthenticatedMe() {
  return {
    isAuthenticated: true,
    emailVerified: true,
    user: {
      id: "c3333333-cccc-cccc-cccc-cccccccccccc",
      email: "member@example.com",
    },
    roles: ["USER"],
    accessTokenExpiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 600,
  }
}

async function mockAuthenticatedSession(page: Page) {
  await page.route("**/api/bff/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildAuthenticatedMe()),
    })
  })
}

async function mockTicketCreation(
  page: Page,
  ticketId: string,
  ticketNumber: string,
) {
  await page.route("**/api/bff/support/tickets", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        ticketId,
        ticketNumber,
        guestAccessToken: null,
      }),
    })
  })
}

// ---------------------------------------------------------------------------
// Helpers – login
// ---------------------------------------------------------------------------

async function login(page: Page, email: string, password: string) {
  await page.goto("/login")
  await expect(page.getByTestId("login-title")).toBeVisible()

  await page.getByTestId("login-email").fill(email)
  await page.getByTestId("login-password").fill(password)

  const [loginResp] = await Promise.all([
    page.waitForResponse((resp: Response) => {
      return (
        resp.url().includes("/api/bff/auth/login") &&
        resp.request().method() === "POST"
      )
    }),
    page.getByTestId("login-submit").click(),
  ])

  if (!loginResp.ok()) {
    const bodyText = await loginResp.text().catch(() => "<unable to read body>")
    throw new Error(`Login failed: HTTP ${loginResp.status()}\n${bodyText}`)
  }

  await expect(page).toHaveURL(/\/account|\/admin/, { timeout: 15_000 })
}

// ---------------------------------------------------------------------------
// Tests: support/new page – UI (mocked backend)
// ---------------------------------------------------------------------------

test.describe("support page UI", () => {
  test("support/new page renders the form", async ({ page }) => {
    await mockAuthenticatedSession(page)

    await page.goto("/support/new", { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("support-new-page")).toBeVisible()
    await expect(page.getByTestId("support-request-form")).toBeVisible()
    await expect(page.getByTestId("support-form-subject")).toBeVisible()
    await expect(page.getByTestId("support-form-category")).toBeVisible()
    await expect(page.getByTestId("support-form-message")).toBeVisible()
    await expect(page.getByTestId("support-form-submit")).toBeVisible()
  })

  test("orderId param prefills ORDER_HELP category and shows context summary", async ({
    page,
  }) => {
    await mockAuthenticatedSession(page)

    await page.goto(
      `/support/new?orderId=${ORDER_ID}&category=ORDER_HELP`,
      { waitUntil: "domcontentloaded" },
    )

    await expect(page.getByTestId("support-request-form")).toBeVisible()

    // Context summary banner should be visible
    await expect(page.getByTestId("support-form-context-summary")).toBeVisible()

    // Category select should be pre-filled to ORDER_HELP
    const categoryValue = await page
      .getByTestId("support-form-category")
      .inputValue()
    expect(categoryValue).toBe("ORDER_HELP")
  })

  test("shippingInvoiceId param prefills SHIPPING_HELP category and shows context summary", async ({
    page,
  }) => {
    await mockAuthenticatedSession(page)

    await page.goto(
      `/support/new?shippingInvoiceId=${SHIPPING_INVOICE_ID}&category=SHIPPING_HELP`,
      { waitUntil: "domcontentloaded" },
    )

    await expect(page.getByTestId("support-request-form")).toBeVisible()
    await expect(page.getByTestId("support-form-context-summary")).toBeVisible()

    const categoryValue = await page
      .getByTestId("support-form-category")
      .inputValue()
    expect(categoryValue).toBe("SHIPPING_HELP")
  })

  test("category param alone prefills the category with no context summary", async ({
    page,
  }) => {
    await mockAuthenticatedSession(page)

    await page.goto("/support/new?category=OPEN_BOX_HELP", {
      waitUntil: "domcontentloaded",
    })

    await expect(page.getByTestId("support-request-form")).toBeVisible()
    await expect(
      page.getByTestId("support-form-context-summary"),
    ).not.toBeVisible()

    const categoryValue = await page
      .getByTestId("support-form-category")
      .inputValue()
    expect(categoryValue).toBe("OPEN_BOX_HELP")
  })

  test("generic support/new page has no context summary", async ({ page }) => {
    await mockAuthenticatedSession(page)

    await page.goto("/support/new", { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("support-request-form")).toBeVisible()
    await expect(
      page.getByTestId("support-form-context-summary"),
    ).not.toBeVisible()
  })

  test("form shows success state with ticket number after mocked submission", async ({
    page,
  }) => {
    await mockAuthenticatedSession(page)
    await mockTicketCreation(page, "d4444444-dddd-dddd-dddd-dddddddddddd", "MK-00042")

    await page.goto("/support/new", { waitUntil: "domcontentloaded" })

    await page.getByTestId("support-form-subject").fill("Test subject")
    await page.getByTestId("support-form-category").selectOption("OTHER")
    await page.getByTestId("support-form-message").fill("This is a test message with enough detail.")

    await page.getByTestId("support-form-submit").click()

    await expect(page.getByTestId("support-form-success")).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId("support-form-ticket-number")).toContainText(
      "MK-00042",
    )
  })

  test("form shows error message when submission fails", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await page.route("**/api/bff/support/tickets", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ message: "INVALID_CATEGORY" }),
      })
    })

    await page.goto("/support/new", { waitUntil: "domcontentloaded" })

    await page.getByTestId("support-form-subject").fill("Test subject")
    await page.getByTestId("support-form-category").selectOption("OTHER")
    await page.getByTestId("support-form-message").fill("Test message content.")

    await page.getByTestId("support-form-submit").click()

    await expect(page.getByTestId("support-form-error")).toBeVisible({
      timeout: 10_000,
    })
  })
})

// ---------------------------------------------------------------------------
// Tests: entry point links – UI (mocked backend)
// ---------------------------------------------------------------------------

test.describe("support entry point links", () => {
  test("order detail support link points to /support/new with orderId", async ({
    page,
  }) => {
    await mockAuthenticatedSession(page)

    // Mock order data to render the detail page
    await page.route("**/api/bff/orders/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: ORDER_ID,
          orderNumber: "MK-20260402-TEST01",
          status: "CONFIRMED",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          totalCents: 5000,
          lines: [],
        }),
      })
    })

    await page.goto(`/orders/${ORDER_ID}`, {
      waitUntil: "domcontentloaded",
    })

    const supportLink = page.getByTestId("order-detail-support-link")
    await expect(supportLink).toBeVisible({ timeout: 10_000 })

    const href = await supportLink.getAttribute("href")
    expect(href).toContain("/support/new")
    expect(href).toContain(`orderId=${encodeURIComponent(ORDER_ID)}`)
    expect(href).toContain("category=ORDER_HELP")
  })

  test("shipping invoice detail support link points to /support/new with shippingInvoiceId", async ({
    page,
  }) => {
    await mockAuthenticatedSession(page)

    await page.route("**/api/bff/shipping-invoices/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          shippingInvoiceId: SHIPPING_INVOICE_ID,
          invoiceNumber: "MK-SI-TEST01",
          status: "PENDING",
          amountCents: 1500,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        }),
      })
    })

    await page.goto(`/account/shipping-invoices/${SHIPPING_INVOICE_ID}`, {
      waitUntil: "domcontentloaded",
    })

    const supportLink = page.getByTestId("shipping-invoice-detail-support-link")
    await expect(supportLink).toBeVisible({ timeout: 10_000 })

    const href = await supportLink.getAttribute("href")
    expect(href).toContain("/support/new")
    expect(href).toContain(
      `shippingInvoiceId=${encodeURIComponent(SHIPPING_INVOICE_ID)}`,
    )
    expect(href).toContain("category=SHIPPING_HELP")
  })
})

// ---------------------------------------------------------------------------
// Tests: full submission flow against real backend
// ---------------------------------------------------------------------------

test.describe("support submission with real backend", () => {
  test.skip(
    !process.env.E2E_BACKEND,
    "Requires backend running (set E2E_BACKEND=1).",
  )
  test.skip(
    !hasMemberFixture,
    "Requires seeded member fixture (set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD).",
  )

  test("authenticated member can submit support ticket and see ticket number", async ({
    page,
  }) => {
    await page.context().setExtraHTTPHeaders({
      "X-Test-RateLimit-Key": `support-member-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    })

    await login(page, process.env.E2E_MEMBER_EMAIL!, process.env.E2E_MEMBER_PASSWORD!)

    await page.goto("/support/new?category=OTHER", {
      waitUntil: "domcontentloaded",
    })

    await expect(page.getByTestId("support-request-form")).toBeVisible()

    await page
      .getByTestId("support-form-subject")
      .fill("E2E test – please ignore")
    await page.getByTestId("support-form-category").selectOption("OTHER")
    await page
      .getByTestId("support-form-message")
      .fill(
        "This is an automated E2E test ticket. Please disregard and close.",
      )

    await Promise.all([
      page.waitForResponse(
        (resp: Response) =>
          resp.url().includes("/api/bff/support/tickets") &&
          resp.request().method() === "POST",
      ),
      page.getByTestId("support-form-submit").click(),
    ])

    await expect(page.getByTestId("support-form-success")).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByTestId("support-form-ticket-number")).toBeVisible()
    const ticketNumberText = await page
      .getByTestId("support-form-ticket-number")
      .textContent()
    expect(ticketNumberText).toMatch(/MK-/)
  })
})

// ---------------------------------------------------------------------------
// Tests: admin inbox sees submitted ticket
// ---------------------------------------------------------------------------

test.describe("admin sees submitted ticket", () => {
  test.skip(
    !process.env.E2E_BACKEND,
    "Requires backend running (set E2E_BACKEND=1).",
  )
  test.skip(
    !hasMemberFixture,
    "Requires seeded member fixture (set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD).",
  )
  test.skip(
    !hasAdminFixture,
    "Requires seeded admin fixture (set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD).",
  )

  test("ticket submitted by member appears in admin support inbox", async ({
    page,
  }) => {
    const uniqueSubject = `E2E inbox test ${Date.now()}`

    // Member submits ticket
    await page.context().setExtraHTTPHeaders({
      "X-Test-RateLimit-Key": `support-inbox-member-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    })

    await login(page, process.env.E2E_MEMBER_EMAIL!, process.env.E2E_MEMBER_PASSWORD!)

    await page.goto("/support/new?category=OTHER", {
      waitUntil: "domcontentloaded",
    })

    await page.getByTestId("support-form-subject").fill(uniqueSubject)
    await page.getByTestId("support-form-category").selectOption("OTHER")
    await page
      .getByTestId("support-form-message")
      .fill("This is an automated inbox visibility test. Please ignore.")

    await Promise.all([
      page.waitForResponse(
        (resp: Response) =>
          resp.url().includes("/api/bff/support/tickets") &&
          resp.request().method() === "POST",
      ),
      page.getByTestId("support-form-submit").click(),
    ])

    await expect(page.getByTestId("support-form-success")).toBeVisible({
      timeout: 15_000,
    })

    // Admin logs in and views inbox
    await page.context().clearCookies()
    await page.context().setExtraHTTPHeaders({
      "X-Test-RateLimit-Key": `support-inbox-admin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    })

    await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!)

    await page.goto("/admin/support", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("admin-support-page")).toBeVisible()

    await expect(page.locator("body")).toContainText(uniqueSubject, {
      timeout: 15_000,
    })
  })
})
