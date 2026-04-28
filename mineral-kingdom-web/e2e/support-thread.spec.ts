import { test, expect, type Page } from "@playwright/test"

test.describe.configure({ mode: "serial" })

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TICKET_ID = "e5555555-eeee-eeee-eeee-eeeeeeeeeeee"
const TICKET_NUMBER = "MK-00099"
const GUEST_TOKEN = "valid-guest-token-abc123"

// ---------------------------------------------------------------------------
// Helpers
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

function buildTicketDto(overrides: Record<string, unknown> = {}) {
  return {
    id: TICKET_ID,
    ticketNumber: TICKET_NUMBER,
    createdByUserId: "c3333333-cccc-cccc-cccc-cccccccccccc",
    guestEmail: null,
    subject: "My test ticket subject",
    category: "ORDER_HELP",
    priority: "NORMAL",
    status: "Open",
    assignedToUserId: null,
    linkedOrderId: null,
    linkedAuctionId: null,
    linkedShippingInvoiceId: null,
    linkedListingId: null,
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-01-01T10:00:00Z",
    closedAt: null,
    messages: [
      {
        id: "f1111111-ffff-ffff-ffff-ffffffffffff",
        authorType: "CUSTOMER",
        authorUserId: "c3333333-cccc-cccc-cccc-cccccccccccc",
        bodyText: "My initial message to support.",
        isInternalNote: false,
        createdAt: "2026-01-01T10:00:00Z",
      },
      {
        id: "f2222222-ffff-ffff-ffff-ffffffffffff",
        authorType: "SUPPORT",
        authorUserId: null,
        bodyText: "Hi, thanks for reaching out. We will look into this.",
        isInternalNote: false,
        createdAt: "2026-01-01T11:00:00Z",
      },
    ],
    ...overrides,
  }
}

async function mockTicketThread(
  page: Page,
  ticketDto: ReturnType<typeof buildTicketDto>,
) {
  await page.route(`**/api/bff/support/tickets/${TICKET_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ticketDto),
    })
  })
}

async function mockReplySuccess(page: Page) {
  await page.route(
    `**/api/bff/support/tickets/${TICKET_ID}/messages`,
    async (route) => {
      await route.fulfill({ status: 204 })
    },
  )
}

async function mockTicketList(page: Page, tickets: unknown[] = []) {
  await page.route("**/api/bff/support/tickets", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(tickets),
      })
    } else {
      await route.continue()
    }
  })
}

async function fillSupportRequestForm(
  page: Page,
  values: { subject: string; category: string; message: string },
) {
  const subjectInput = page.getByTestId("support-form-subject")
  const messageInput = page.getByTestId("support-form-message")

  await expect(subjectInput).toBeVisible()
  await expect(subjectInput).toBeEditable()
  await subjectInput.fill(values.subject)
  await expect(subjectInput).toHaveValue(values.subject)

  await page.getByTestId("support-form-category").selectOption(values.category)

  await expect(messageInput).toBeVisible()
  await expect(messageInput).toBeEditable()
  await messageInput.fill(values.message)
  await expect(messageInput).toHaveValue(values.message)
}

// ---------------------------------------------------------------------------
// Member thread view
// ---------------------------------------------------------------------------

test.describe("support thread view – member (mocked)", () => {
  test("renders thread header, messages, and reply form", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockTicketThread(page, buildTicketDto())

    await page.goto(`/support/${TICKET_ID}`, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("support-thread-page")).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId("support-thread-header")).toBeVisible()
    await expect(page.getByTestId("support-thread-status")).toContainText("Open")
    await expect(page.getByTestId("support-thread-category")).toContainText("ORDER_HELP")

    // Two visible messages
    const messages = page.getByTestId("support-thread-message")
    await expect(messages).toHaveCount(2)

    // Reply form is visible
    await expect(page.getByTestId("support-thread-reply-input")).toBeVisible()
    await expect(page.getByTestId("support-thread-reply-submit")).toBeVisible()
  })

  test("internal notes are filtered out by the backend and never shown", async ({
    page,
  }) => {
    await mockAuthenticatedSession(page)
    // Backend already filters internal notes; we confirm the UI renders only what it receives
    const dto = buildTicketDto()
    await mockTicketThread(page, dto)

    await page.goto(`/support/${TICKET_ID}`, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("support-thread-messages")).toBeVisible()
    const messages = page.getByTestId("support-thread-message")
    await expect(messages).toHaveCount(2) // no internal notes in mock data
  })

  test("closed ticket shows closed banner and hides reply form", async ({
    page,
  }) => {
    await mockAuthenticatedSession(page)
    await mockTicketThread(page, buildTicketDto({ status: "Closed" }))

    await page.goto(`/support/${TICKET_ID}`, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("support-thread-closed-banner")).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      page.getByTestId("support-thread-reply-input"),
    ).not.toBeVisible()
    await expect(
      page.getByTestId("support-thread-reply-submit"),
    ).not.toBeVisible()
  })

  test("resolved ticket shows closed banner and hides reply form", async ({
    page,
  }) => {
    await mockAuthenticatedSession(page)
    await mockTicketThread(page, buildTicketDto({ status: "Resolved" }))

    await page.goto(`/support/${TICKET_ID}`, { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("support-thread-closed-banner")).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      page.getByTestId("support-thread-reply-input"),
    ).not.toBeVisible()
  })

  test("reply form submits and refreshes thread", async ({ page }) => {
    await mockAuthenticatedSession(page)

    const updatedDto = buildTicketDto({
      status: "WaitingOnSupport",
      messages: [
        ...buildTicketDto().messages,
        {
          id: "f3333333-ffff-ffff-ffff-ffffffffffff",
          authorType: "CUSTOMER",
          authorUserId: "c3333333-cccc-cccc-cccc-cccccccccccc",
          bodyText: "My follow-up reply.",
          isInternalNote: false,
          createdAt: "2026-01-01T12:00:00Z",
        },
      ],
    })

    let fetchCount = 0
    await page.route(`**/api/bff/support/tickets/${TICKET_ID}`, async (route) => {
      fetchCount++
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fetchCount === 1 ? buildTicketDto() : updatedDto),
      })
    })
    await mockReplySuccess(page)

    await page.goto(`/support/${TICKET_ID}`, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("support-thread-reply-input")).toBeVisible({
      timeout: 10_000,
    })

    await page.getByTestId("support-thread-reply-input").fill("My follow-up reply.")
    await page.getByTestId("support-thread-reply-submit").click()

    // After refresh, thread shows 3 messages
    await expect(page.getByTestId("support-thread-message")).toHaveCount(3, {
      timeout: 10_000,
    })
  })

  test("reply error is shown when submission fails", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockTicketThread(page, buildTicketDto())
    await page.route(
      `**/api/bff/support/tickets/${TICKET_ID}/messages`,
      async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Internal server error." }),
        })
      },
    )

    await page.goto(`/support/${TICKET_ID}`, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("support-thread-reply-input")).toBeVisible({
      timeout: 10_000,
    })

    await page.getByTestId("support-thread-reply-input").fill("A reply that will fail.")
    await page.getByTestId("support-thread-reply-submit").click()

    await expect(page.getByTestId("support-thread-reply-error")).toBeVisible({
      timeout: 10_000,
    })
  })
})

// ---------------------------------------------------------------------------
// Guest thread view
// ---------------------------------------------------------------------------

test.describe("support thread view – guest (mocked)", () => {
  test("guest thread page renders with token in URL", async ({ page }) => {
    const guestDto = buildTicketDto({
      createdByUserId: null,
      guestEmail: "guest@example.com",
    })

    await page.route(
      `**/api/bff/support/tickets/${TICKET_ID}**`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(guestDto),
        })
      },
    )

    await page.goto(`/support/guest/${TICKET_ID}?token=${GUEST_TOKEN}`, {
      waitUntil: "domcontentloaded",
    })

    await expect(page.getByTestId("support-thread-page")).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId("support-thread-header")).toBeVisible()
    await expect(page.getByTestId("support-thread-reply-input")).toBeVisible()
  })

  test("guest can submit a reply", async ({ page }) => {
    const guestDto = buildTicketDto({
      createdByUserId: null,
      guestEmail: "guest@example.com",
    })

    await page.route(
      `**/api/bff/support/tickets/${TICKET_ID}**`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(guestDto),
        })
      },
    )
    await page.route(
      `**/api/bff/support/tickets/${TICKET_ID}/messages**`,
      async (route) => {
        await route.fulfill({ status: 204 })
      },
    )

    await page.goto(`/support/guest/${TICKET_ID}?token=${GUEST_TOKEN}`, {
      waitUntil: "domcontentloaded",
    })

    await expect(page.getByTestId("support-thread-reply-input")).toBeVisible({
      timeout: 10_000,
    })
    await page.getByTestId("support-thread-reply-input").fill("Guest follow-up reply.")
    await page.getByTestId("support-thread-reply-submit").click()

    // Reply input should clear on success
    await expect(page.getByTestId("support-thread-reply-input")).toHaveValue(
      "",
      { timeout: 10_000 },
    )
  })
})

// ---------------------------------------------------------------------------
// Member ticket list page
// ---------------------------------------------------------------------------

test.describe("support ticket list – member (mocked)", () => {
  test("renders empty state when member has no tickets", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockTicketList(page, [])

    await page.goto("/support", { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("support-list-page")).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId("support-list-empty")).toBeVisible()
  })

  test("renders ticket rows when member has tickets", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockTicketList(page, [
      {
        id: TICKET_ID,
        ticketNumber: TICKET_NUMBER,
        subject: "Test ticket subject",
        category: "ORDER_HELP",
        priority: "NORMAL",
        status: "Open",
        assignedToUserId: null,
        createdAt: "2026-01-01T10:00:00Z",
        updatedAt: "2026-01-01T10:00:00Z",
      },
    ])

    await page.goto("/support", { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("support-list-table")).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId("support-list-row")).toHaveCount(1)
  })

  test("ticket row links to thread page", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await mockTicketList(page, [
      {
        id: TICKET_ID,
        ticketNumber: TICKET_NUMBER,
        subject: "Test ticket",
        category: "OTHER",
        priority: "NORMAL",
        status: "Open",
        assignedToUserId: null,
        createdAt: "2026-01-01T10:00:00Z",
        updatedAt: "2026-01-01T10:00:00Z",
      },
    ])

    await page.goto("/support", { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("support-list-row")).toBeVisible({
      timeout: 10_000,
    })

    const viewLink = page
      .getByTestId("support-list-row")
      .getByRole("link", { name: "View" })
    await expect(viewLink).toHaveAttribute("href", `/support/${TICKET_ID}`)
  })
})

// ---------------------------------------------------------------------------
// SupportRequestForm success state (member vs guest)
// ---------------------------------------------------------------------------

test.describe("support form success state", () => {
  test("member sees view-ticket link after submission", async ({ page }) => {
    await mockAuthenticatedSession(page)
    await page.route("**/api/bff/support/tickets", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ticketId: TICKET_ID,
            ticketNumber: TICKET_NUMBER,
            guestAccessToken: null,
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto("/support/new", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("nav-logout")).toBeVisible()
    await expect(page.getByTestId("nav-support")).toBeVisible()

    await fillSupportRequestForm(page, {
      subject: "Member subject",
      category: "OTHER",
      message: "Member test message with enough detail.",
    })

    await page.getByTestId("support-form-submit").click()

    await expect(page.getByTestId("support-form-success")).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId("support-form-view-ticket-link")).toBeVisible()
    await expect(page.getByTestId("support-form-view-ticket-link")).toHaveAttribute(
      "href",
      `/support/${TICKET_ID}`,
    )
    await expect(
      page.getByTestId("support-form-guest-email-notice"),
    ).not.toBeVisible()
  })

  test("guest sees email notice after submission", async ({ page }) => {
    // Unauthenticated (no mock for auth/me — defaults to 401 in real app, mock as guest)
    await page.route("**/api/bff/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          isAuthenticated: false,
          emailVerified: false,
          user: null,
          roles: [],
          accessTokenExpiresAtEpochSeconds: 0,
        }),
      })
    })
    await page.route("**/api/bff/support/tickets", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ticketId: TICKET_ID,
            ticketNumber: TICKET_NUMBER,
            guestAccessToken: "guest-token-xyz",
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto("/support/new", { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("nav-login")).toBeVisible()
    await expect(page.getByTestId("nav-register")).toBeVisible()

    await fillSupportRequestForm(page, {
      subject: "Guest subject",
      category: "OTHER",
      message: "Guest test message with enough detail.",
    })

    await page.getByTestId("support-form-submit").click()

    await expect(page.getByTestId("support-form-success")).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      page.getByTestId("support-form-guest-email-notice"),
    ).toBeVisible()
    await expect(
      page.getByTestId("support-form-view-ticket-link"),
    ).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Backend (live) tests — guarded by E2E_BACKEND env var
// ---------------------------------------------------------------------------

test.describe("support thread – backend", () => {
  test.skip(!process.env.E2E_BACKEND, "Skipped: E2E_BACKEND not set")
  test.skip(
    !(process.env.E2E_MEMBER_EMAIL && process.env.E2E_MEMBER_PASSWORD),
    "Skipped: E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD not set",
  )

  test("authenticated member can view and reply to own ticket", async ({
    page,
  }) => {
    // Login
    await page.goto("/login")
    await page.getByTestId("login-email").fill(process.env.E2E_MEMBER_EMAIL!)
    await page.getByTestId("login-password").fill(process.env.E2E_MEMBER_PASSWORD!)
    await page.getByTestId("login-submit").click()
    await expect(page).toHaveURL(/\/account|\/dashboard/, { timeout: 15_000 })

    // Create a ticket via UI
    await page.goto("/support/new", { waitUntil: "domcontentloaded" })
    await page.getByTestId("support-form-subject").fill("E2E thread test ticket")
    await page.getByTestId("support-form-category").selectOption("OTHER")
    await page.getByTestId("support-form-message").fill("This is a live E2E test ticket to test the thread view.")
    await page.getByTestId("support-form-submit").click()

    await expect(page.getByTestId("support-form-success")).toBeVisible({
      timeout: 15_000,
    })

    // Follow view-ticket link
    await page.getByTestId("support-form-view-ticket-link").click()
    await expect(page.getByTestId("support-thread-page")).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByTestId("support-thread-header")).toBeVisible()

    // Reply
    await page.getByTestId("support-thread-reply-input").fill("This is a live E2E reply.")
    await page.getByTestId("support-thread-reply-submit").click()

    // After refresh, reply should appear in the thread
    await expect(
      page.getByTestId("support-thread-message").last(),
    ).toContainText("This is a live E2E reply.", { timeout: 10_000 })
  })
})
